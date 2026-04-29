import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Loader2, Smartphone, CheckCircle, RefreshCw, Plus, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepEvolutionConnectProps {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  onInstanceConnected?: () => void;
}

interface ExistingInstance {
  id: string;
  name: string;
  instance_name: string;
  status: string | null;
  is_default: boolean | null;
  phone_number: string | null;
}

type ViewMode = 'choose' | 'new' | 'creating' | 'qrcode' | 'connected';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export const StepEvolutionConnect: React.FC<StepEvolutionConnectProps> = ({
  evolutionApiUrl,
  evolutionApiKey,
  onInstanceConnected,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('choose');
  const [instanceName, setInstanceName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isFetchingQr, setIsFetchingQr] = useState(false);
  const [existingInstances, setExistingInstances] = useState<ExistingInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [selectedInstanceName, setSelectedInstanceName] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchInstances = async () => {
      setLoadingInstances(true);
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('id, name, instance_name, status, is_default, phone_number')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const instances = data || [];
      setExistingInstances(instances);

      const connectedInstance = instances.find(i => i.status === 'connected');
      if (connectedInstance) {
        setSelectedInstanceName(connectedInstance.name);
        setViewMode('connected');
      } else if (instances.length === 0) {
        setViewMode('new');
      }
      setLoadingInstances(false);
    };
    fetchInstances();
  }, []);

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    const slug = val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    setInstanceName(slug);
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const fetchQr = useCallback(async (id: string) => {
    setIsFetchingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-uazapi-qrcode', {
        body: { instance_id: id },
      });
      if (error) throw error;

      if (data?.connected) {
        setQrCode(null);
        setViewMode('connected');
        stopPolling();
        onInstanceConnected?.();
      } else if (data?.qr_code) {
        setQrCode(data.qr_code);
      }
    } catch (err) {
      console.warn('[StepEvolutionConnect] QR fetch error:', err);
    } finally {
      setIsFetchingQr(false);
    }
  }, [stopPolling, onInstanceConnected]);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollingRef.current = setInterval(() => fetchQr(id), 5000);
  }, [fetchQr, stopPolling]);

  const handleSelectExisting = (instance: ExistingInstance) => {
    setInstanceId(instance.id);
    setSelectedInstanceName(instance.name);
    if (instance.status === 'connected') {
      setViewMode('connected');
      onInstanceConnected?.();
    } else {
      setViewMode('qrcode');
      fetchQr(instance.id);
      startPolling(instance.id);
    }
  };

  const handleCreateInstance = async () => {
    if (!displayName.trim() || !instanceName.trim()) {
      toast.error('Preencha o nome da conexão');
      return;
    }

    setIsCreating(true);
    setViewMode('creating');
    setSelectedInstanceName(displayName);

    try {
      const { data, error } = await supabase.functions.invoke('create-uazapi-instance', {
        body: {
          base_url: evolutionApiUrl.trim(),
          token: evolutionApiKey.trim(),
          instance_name: instanceName,
          name: displayName,
          is_default: isDefault,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro ao criar instância');
      }

      setInstanceId(data.instance_id);

      if (data.qr_code) {
        setQrCode(data.qr_code);
        setViewMode('qrcode');
        startPolling(data.instance_id);
      } else {
        setViewMode('qrcode');
        await fetchQr(data.instance_id);
        startPolling(data.instance_id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(msg);
      setViewMode('new');
    } finally {
      setIsCreating(false);
    }
  };

  if (loadingInstances) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando instâncias...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <QrCode className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Conectar WhatsApp</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {existingInstances.length > 0 && viewMode === 'choose'
            ? 'Selecione uma instância existente ou crie uma nova.'
            : 'Crie uma instância e escaneie o QR Code para conectar seu WhatsApp.'}
        </p>
      </motion.div>

      <div className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {/* Choose existing or new */}
          {viewMode === 'choose' && existingInstances.length > 0 && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium">Instâncias existentes</Label>
              <div className="space-y-2">
                {existingInstances.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => handleSelectExisting(inst)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      inst.status === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {inst.status === 'connected' ? (
                        <Wifi className="w-4 h-4" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{inst.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inst.phone_number || inst.instance_name}
                        {inst.is_default && <span className="ml-1.5 text-primary">• padrão</span>}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      inst.status === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {inst.status === 'connected' ? 'Conectado' : inst.status || 'Desconectado'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setViewMode('new')}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar nova instância
                </Button>
              </div>
            </motion.div>
          )}

          {/* New instance form */}
          {viewMode === 'new' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {existingInstances.length > 0 && (
                <button
                  onClick={() => setViewMode('choose')}
                  className="text-xs text-primary hover:underline mb-2"
                >
                  ← Voltar para instâncias existentes
                </button>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="displayNameConnect">Nome da Conexão</Label>
                <Input
                  id="displayNameConnect"
                  placeholder="Ex: WhatsApp Principal"
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instanceSlugConnect">
                  Identificador
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(gerado automaticamente)</span>
                </Label>
                <Input
                  id="instanceSlugConnect"
                  value={instanceName}
                  readOnly
                  placeholder="whatsapp-principal"
                  className="font-mono text-sm bg-muted/50 cursor-not-allowed"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefaultConnect"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <Label htmlFor="isDefaultConnect" className="font-normal cursor-pointer text-sm">
                  Definir como instância padrão
                </Label>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCreateInstance}
                  disabled={!displayName.trim() || !instanceName.trim()}
                  className="w-full gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Gerar Instância e QR Code
                </Button>
              </div>
            </motion.div>
          )}

          {/* Creating */}
          {viewMode === 'creating' && (
            <motion.div
              key="creating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Criando instância...</p>
                <p className="text-sm text-muted-foreground mt-1">Conectando à uazapi e gerando QR Code</p>
              </div>
            </motion.div>
          )}

          {/* QR Code */}
          {viewMode === 'qrcode' && (
            <motion.div
              key="qrcode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-2"
            >
              <div className="text-center">
                <p className="font-medium text-foreground">Escaneie o QR Code</p>
                <p className="text-sm text-muted-foreground">WhatsApp → Menu → Aparelhos Conectados → Conectar</p>
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

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => instanceId && fetchQr(instanceId)}
                disabled={isFetchingQr}
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingQr ? 'animate-spin' : ''}`} />
                Atualizar QR
              </Button>
            </motion.div>
          )}

          {/* Connected */}
          {viewMode === 'connected' && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10 gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20"
              >
                <CheckCircle className="w-10 h-10 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">WhatsApp Conectado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedInstanceName ? (
                    <>A instância <strong>{selectedInstanceName}</strong> está ativa e pronta.</>
                  ) : (
                    'Instância conectada e configurada como padrão.'
                  )}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                {existingInstances.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setViewMode('choose')} className="gap-1.5 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Gerenciar instâncias
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setViewMode('new')} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Nova instância
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
