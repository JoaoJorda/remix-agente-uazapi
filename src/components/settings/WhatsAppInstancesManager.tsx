import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Wifi, WifiOff, QrCode, Trash2, Star, MoreVertical, Smartphone, Cloud, Server, Webhook, Settings2, PhoneOff, Users, Radio, BookOpen, Power } from 'lucide-react';
import { useWhatsAppInstances, WhatsAppInstance, ProviderType } from '@/hooks/whatsapp/useWhatsAppInstances';
import { AddInstanceDialog } from './AddInstanceDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const providerLabels: Record<ProviderType, string> = {
  official: 'API Oficial (Meta)',
  uazapi: 'uazapi',
};

const providerIcons: Record<ProviderType, React.ReactNode> = {
  official: <Cloud className="w-4 h-4" />,
  uazapi: <Server className="w-4 h-4" />,
};

interface InstanceSettings {
  reply_to_groups: boolean;
  reject_call: boolean;
  msg_call: string;
  always_online: boolean;
  read_messages: boolean;
  webhook_enabled: boolean;
}

interface WhatsAppInstancesManagerProps {
  uazapiBaseUrl?: string | null;
  uazapiToken?: string | null;
}

export function WhatsAppInstancesManager({ uazapiBaseUrl, uazapiToken }: WhatsAppInstancesManagerProps = {}) {
  const { instances, isLoading, refetch, deleteInstance, setDefaultInstance } = useWhatsAppInstances();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogInstance, setDeleteDialogInstance] = useState<WhatsAppInstance | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewQrInstance, setViewQrInstance] = useState<WhatsAppInstance | null>(null);
  const [reconfiguringWebhook, setReconfiguringWebhook] = useState<string | null>(null);

  // QR Code polling state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrConnected, setQrConnected] = useState(false);
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopQrPolling = useCallback(() => {
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
      qrPollingRef.current = null;
    }
  }, []);

  const fetchQrCode = useCallback(async (instanceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-uazapi-qrcode', {
        body: { instance_id: instanceId },
      });
      if (error) throw error;
      if (data?.connected) {
        setQrConnected(true);
        setQrCode(null);
        stopQrPolling();
        await queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
        await refetch();
      } else if (data?.qr_code) {
        setQrCode(data.qr_code);
      }
    } catch (err) {
      console.warn('[QR polling] error:', err);
    }
  }, [queryClient, refetch, stopQrPolling]);

  const openQrModal = useCallback(async (instance: WhatsAppInstance) => {
    setViewQrInstance(instance);
    setQrCode(null);
    setQrConnected(false);
    setQrLoading(true);
    stopQrPolling();
    await fetchQrCode(instance.id);
    setQrLoading(false);
    // Poll every 20s to refresh QR code
    qrPollingRef.current = setInterval(() => fetchQrCode(instance.id), 20000);
  }, [fetchQrCode, stopQrPolling]);

  const closeQrModal = useCallback(() => {
    stopQrPolling();
    setViewQrInstance(null);
    setQrCode(null);
    setQrConnected(false);
  }, [stopQrPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopQrPolling();
  }, [stopQrPolling]);

  // Settings modal state
  const [settingsInstance, setSettingsInstance] = useState<WhatsAppInstance | null>(null);
  const [settingsValues, setSettingsValues] = useState<InstanceSettings>({
    reply_to_groups: false,
    reject_call: false,
    msg_call: '',
    always_online: false,
    read_messages: false,
    webhook_enabled: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const openSettingsModal = (instance: WhatsAppInstance) => {
    const meta = (instance.metadata as Record<string, unknown>) ?? {};
    setSettingsInstance(instance);
    setSettingsValues({
      reply_to_groups: instance.reply_to_groups ?? false,
      reject_call: meta.reject_call as boolean ?? false,
      msg_call: meta.msg_call as string ?? '',
      always_online: meta.always_online as boolean ?? false,
      read_messages: meta.read_messages as boolean ?? false,
      webhook_enabled: meta.webhook_enabled !== false, // default true
    });
  };

  const handleSaveSettings = async () => {
    if (!settingsInstance) return;
    setIsSavingSettings(true);
    try {
      const groupsIgnore = !settingsValues.reply_to_groups;

      // 1. Atualizar banco de dados
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({
          reply_to_groups: settingsValues.reply_to_groups,
          metadata: {
            ...((settingsInstance.metadata as Record<string, unknown>) ?? {}),
            reject_call: settingsValues.reject_call,
            msg_call: settingsValues.msg_call,
            always_online: settingsValues.always_online,
            read_messages: settingsValues.read_messages,
            webhook_enabled: settingsValues.webhook_enabled,
          },
        })
        .eq('id', settingsInstance.id);

      if (error) throw error;

      // 2. Sincronizar com uazapi (apenas instâncias uazapi)
      if (settingsInstance.provider_type !== 'official') {
        const { error: fnError } = await supabase.functions.invoke('update-uazapi-settings', {
          body: {
            instance_id: settingsInstance.id,
            groups_ignore: groupsIgnore,
            reject_call: settingsValues.reject_call,
            msg_call: settingsValues.reject_call ? settingsValues.msg_call : '',
            always_online: settingsValues.always_online,
            read_messages: settingsValues.read_messages,
            webhook_enabled: settingsValues.webhook_enabled,
          },
        });
        if (fnError) {
          console.warn('[handleSaveSettings] uazapi sync failed (non-fatal):', fnError);
          toast.warning('Configurações salvas localmente, mas falhou ao sincronizar com a API');
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Configurações salvas com sucesso');
      setSettingsInstance(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar configurações: ${msg}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await supabase.functions.invoke('check-instances-status');
      await refetch();
      toast.success('Status atualizado');
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (deleteDialogInstance) {
      await deleteInstance.mutateAsync(deleteDialogInstance.id);
      setDeleteDialogInstance(null);
    }
  };

  const handleReconfigureWebhook = async (instance: WhatsAppInstance) => {
    if (!uazapiBaseUrl || !uazapiToken) {
      toast.error('URL e Token da uazapi não configurados');
      return;
    }
    setReconfiguringWebhook(instance.id);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook`;
      const baseUrl = uazapiBaseUrl.replace(/\/$/, '');

      const res = await fetch(`${baseUrl}/webhook/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': uazapiToken,
        },
        body: JSON.stringify({
          enabled: true,
          url: webhookUrl,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`uazapi respondeu ${res.status}: ${txt.substring(0, 200)}`);
      }

      toast.success(`Webhook reconfigurado para ${instance.name} ✅`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Falha ao reconfigurar webhook: ${msg}`);
    } finally {
      setReconfiguringWebhook(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Wifi className="w-3 h-3" />
            Conectado
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Conectando
          </span>
        );
      case 'qr_required':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <QrCode className="w-3 h-3" />
            QR Code
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <WifiOff className="w-3 h-3" />
            Desconectado
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Instâncias WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie suas conexões com WhatsApp via uazapi ou API Oficial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Instância
          </Button>
        </div>
      </div>

      {/* Lista de Instâncias */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : instances.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-border rounded-lg">
          <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">Nenhuma instância configurada</p>
          <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Instância
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((instance) => (
            <div
              key={instance.id}
              className="p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {providerIcons[instance.provider_type]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{instance.name}</span>
                      {instance.is_default && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{providerLabels[instance.provider_type]}</span>
                      {instance.phone_number && (
                        <>
                          <span>•</span>
                          <span>{instance.phone_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(instance.status)}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openSettingsModal(instance)}>
                        <Settings2 className="w-4 h-4 mr-2" />
                        Configurações
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {instance.provider_type !== 'official' && instance.status !== 'connected' && (
                        <DropdownMenuItem onClick={() => openQrModal(instance)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Conectar via QR Code
                        </DropdownMenuItem>
                      )}
                      {!instance.is_default && (
                        <DropdownMenuItem onClick={() => setDefaultInstance.mutate(instance.id)}>
                          <Star className="w-4 h-4 mr-2" />
                          Definir como Padrão
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleReconfigureWebhook(instance)}
                        disabled={reconfiguringWebhook === instance.id}
                      >
                        <Webhook className="w-4 h-4 mr-2" />
                        {reconfiguringWebhook === instance.id ? 'Reconfigurando...' : 'Reconfigurar Webhook'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteDialogInstance(instance)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Configurações da Instância */}
      <Dialog open={!!settingsInstance} onOpenChange={(open) => !open && setSettingsInstance(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Configurações — {settingsInstance?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="divide-y divide-border">
            {/* Reject Calls */}
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <PhoneOff className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Rejeitar Chamadas</p>
                    <p className="text-xs text-muted-foreground">Rejeita automaticamente chamadas recebidas</p>
                  </div>
                </div>
                <Switch
                  checked={settingsValues.reject_call}
                  onCheckedChange={(val) => setSettingsValues((prev) => ({ ...prev, reject_call: val }))}
                />
              </div>
              {settingsValues.reject_call && (
                <div className="ml-11 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Mensagem automática de rejeição
                  </label>
                  <Textarea
                    placeholder="Ex: Desculpe, não recebemos ligações. Envie sua mensagem por texto que responderemos o mais breve possível!"
                    value={settingsValues.msg_call}
                    onChange={(e) => setSettingsValues((prev) => ({ ...prev, msg_call: e.target.value }))}
                    className="resize-none text-sm"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Ignore Groups */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Ignorar Grupos</p>
                  <p className="text-xs text-muted-foreground">Não processa mensagens de grupos do WhatsApp</p>
                </div>
              </div>
              <Switch
                checked={!settingsValues.reply_to_groups}
                onCheckedChange={(val) => setSettingsValues((prev) => ({ ...prev, reply_to_groups: !val }))}
              />
            </div>

            {/* Always Online */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Radio className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sempre Online</p>
                  <p className="text-xs text-muted-foreground">Mantém o WhatsApp sempre com status online</p>
                </div>
              </div>
              <Switch
                checked={settingsValues.always_online}
                onCheckedChange={(val) => setSettingsValues((prev) => ({ ...prev, always_online: val }))}
              />
            </div>

            {/* Read Messages */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Marcar como Lido</p>
                  <p className="text-xs text-muted-foreground">Marca automaticamente todas as mensagens como lidas</p>
                </div>
              </div>
              <Switch
                checked={settingsValues.read_messages}
                onCheckedChange={(val) => setSettingsValues((prev) => ({ ...prev, read_messages: val }))}
              />
            </div>

            {/* Webhook Enabled */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Power className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Webhook Ativo</p>
                  <p className="text-xs text-muted-foreground">Desative para pausar o recebimento de mensagens desta instância</p>
                </div>
              </div>
              <Switch
                checked={settingsValues.webhook_enabled}
                onCheckedChange={(val) => setSettingsValues((prev) => ({ ...prev, webhook_enabled: val }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsInstance(null)} disabled={isSavingSettings}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Adicionar */}
      <AddInstanceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        uazapiBaseUrl={uazapiBaseUrl}
        uazapiToken={uazapiToken}
      />

      {/* Dialog de Confirmar Exclusão */}
      <AlertDialog open={!!deleteDialogInstance} onOpenChange={() => setDeleteDialogInstance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover instância?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a instância "{deleteDialogInstance?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de QR Code */}
      <AlertDialog open={!!viewQrInstance} onOpenChange={(open) => { if (!open) closeQrModal(); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Conectar via QR Code
            </AlertDialogTitle>
            <AlertDialogDescription>
              {qrConnected
                ? 'Instância conectada com sucesso!'
                : 'Abra o WhatsApp no seu celular → Dispositivos conectados → Conectar dispositivo.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col items-center gap-3 py-2">
            {qrConnected ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wifi className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">WhatsApp Conectado!</p>
                <p className="text-xs text-muted-foreground">{viewQrInstance?.name}</p>
              </div>
            ) : qrLoading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Buscando QR Code...</p>
              </div>
            ) : qrCode ? (
              <>
                <div className="p-2 border border-border rounded-xl bg-white">
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="w-56 h-56"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />
                  <span>QR Code atualiza automaticamente a cada 20s</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Não foi possível obter o QR Code</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!viewQrInstance) return;
                    setQrLoading(true);
                    await fetchQrCode(viewQrInstance.id);
                    setQrLoading(false);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeQrModal}>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
