import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, QrCode, RefreshCw, ArrowRight, Smartphone, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uazapiBaseUrl?: string | null;
  uazapiToken?: string | null;
}

type Step = 'credentials' | 'creating' | 'qrcode' | 'connected';

export function AddInstanceDialog({ open, onOpenChange, uazapiBaseUrl, uazapiToken }: AddInstanceDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('credentials');

  const [name, setName] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetchingQr, setIsFetchingQr] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const credentialsConfigured = !!(uazapiBaseUrl && uazapiToken);

  const handleNameChange = (val: string) => {
    setName(val);
    const slug = val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    setInstanceName(slug);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome obrigatório';
    if (!instanceName.trim()) errs.instanceName = 'Nome da instância obrigatório';
    if (!/^[a-zA-Z0-9_-]+$/.test(instanceName)) errs.instanceName = 'Apenas letras, números, _ e -';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    if (!credentialsConfigured) {
      toast.error('Configure e salve a URL e Token da uazapi antes de continuar');
      return;
    }

    setIsCreating(true);
    setStep('creating');

    try {
      const { data, error } = await supabase.functions.invoke('create-uazapi-instance', {
        body: {
          base_url: uazapiBaseUrl,
          token: uazapiToken,
          instance_name: instanceName,
          name,
          is_default: isDefault,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro ao criar instância');
      }

      setInstanceId(data.instance_id);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });

      if (data.qr_code) {
        setQrCode(data.qr_code);
        setStep('qrcode');
        startPolling(data.instance_id);
      } else {
        setStep('qrcode');
        await fetchQr(data.instance_id);
        startPolling(data.instance_id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(msg);
      setStep('credentials');
    } finally {
      setIsCreating(false);
    }
  };

  const fetchQr = async (id: string) => {
    setIsFetchingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-uazapi-qrcode', {
        body: { instance_id: id },
      });

      if (error) throw error;

      if (data?.connected) {
        setQrCode(null);
        setStep('connected');
        stopPolling();
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
        return;
      }

      if (data?.qr_code) setQrCode(data.qr_code);
    } catch (err) {
      console.error('Error fetching QR:', err);
    } finally {
      setIsFetchingQr(false);
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      const { data } = await supabase.functions.invoke('get-uazapi-qrcode', {
        body: { instance_id: id },
      });
      if (data?.connected) {
        setQrCode(null);
        setStep('connected');
        stopPolling();
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      } else if (data?.qr_code) {
        setQrCode(data.qr_code);
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleClose = () => {
    stopPolling();
    setStep('credentials');
    setName('');
    setInstanceName('');
    setIsDefault(false);
    setErrors({});
    setInstanceId(null);
    setQrCode(null);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) stopPolling();
    return () => stopPolling();
  }, [open]);

  const stepLabels = ['Configurar', 'Criando', 'QR Code'];
  const stepIndex = step === 'credentials' ? 0 : step === 'creating' ? 1 : 2;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Instância WhatsApp</DialogTitle>
          <DialogDescription>Conecte um número via uazapi</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {stepLabels.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${i <= stepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border
                  ${i < stepIndex ? 'bg-primary border-primary text-primary-foreground' :
                    i === stepIndex ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                {label}
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-px ${i < stepIndex ? 'bg-primary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 1: Configurar */}
        {step === 'credentials' && (
          <div className="space-y-4 mt-2">
            {!credentialsConfigured && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-foreground">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <p className="text-xs">
                  Configure e salve a <strong>URL da uazapi</strong> e o <strong>Token</strong> nas configurações antes de criar instâncias.
                </p>
              </div>
            )}

            {credentialsConfigured && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/40">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">uazapi configurada</span>
                  <br />
                  {uazapiBaseUrl}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da Conexão</Label>
              <Input
                id="name"
                placeholder="Ex: WhatsApp Vendas"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                disabled={!credentialsConfigured}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instanceName">
                Nome da Instância
                <span className="text-muted-foreground font-normal ml-1 text-xs">(identificador único)</span>
              </Label>
              <Input
                id="instanceName"
                placeholder="Ex: vendas-main"
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                disabled={!credentialsConfigured}
              />
              {errors.instanceName && <p className="text-xs text-destructive">{errors.instanceName}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                disabled={!credentialsConfigured}
                className="w-4 h-4 accent-primary"
              />
              <Label htmlFor="isDefault" className="font-normal cursor-pointer">
                Definir como instância padrão
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!credentialsConfigured} className="gap-2">
                Gerar Instância
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Criando */}
        {step === 'creating' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Criando instância...</p>
              <p className="text-sm text-muted-foreground mt-1">Conectando à uazapi e gerando QR Code</p>
            </div>
          </div>
        )}

        {/* STEP 3: QR Code */}
        {step === 'qrcode' && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="text-center">
              <p className="font-medium text-foreground">Escaneie o QR Code</p>
              <p className="text-sm text-muted-foreground">Abra o WhatsApp → Menu → Aparelhos Conectados → Conectar</p>
            </div>

            <div className="w-56 h-56 rounded-xl border-2 border-primary/20 bg-card flex items-center justify-center overflow-hidden">
              {isFetchingQr && !qrCode ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs">Gerando QR...</span>
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <QrCode className="w-10 h-10" />
                  <span className="text-xs">QR não disponível</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Aguardando conexão automaticamente...
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => instanceId && fetchQr(instanceId)}
                disabled={isFetchingQr}
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingQr ? 'animate-spin' : ''}`} />
                Atualizar QR
              </Button>
              <Button variant="ghost" className="flex-1" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Conectado */}
        {step === 'connected' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">WhatsApp Conectado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                A instância <strong>{name}</strong> está ativa e pronta para uso.
              </p>
            </div>
            <Button onClick={handleClose} className="gap-2 mt-2">
              <Smartphone className="w-4 h-4" />
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
