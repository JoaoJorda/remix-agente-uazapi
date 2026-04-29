import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProviderType = 'official' | 'uazapi';
export type InstanceStatus = 'connected' | 'connecting' | 'disconnected' | 'qr_required';

export interface WhatsAppInstance {
  id: string;
  user_id: string | null;
  name: string;
  instance_name: string;
  provider_type: ProviderType;
  instance_id_external: string | null;
  phone_number: string | null;
  status: InstanceStatus;
  qr_code: string | null;
  is_default: boolean;
  is_active: boolean;
  reply_to_groups: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InstanceSecrets {
  base_url: string;
  token: string;
  verify_token?: string;
}

export interface CreateInstanceInput {
  name: string;
  instance_name: string;
  provider_type: ProviderType;
  instance_id_external?: string;
  phone_number?: string;
  is_default?: boolean;
  base_url: string;
  token: string;
  verify_token?: string;
}

export function useWhatsAppInstances() {
  const queryClient = useQueryClient();

  const instancesQuery = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppInstance[];
    },
  });

  const createInstance = useMutation({
    mutationFn: async (input: CreateInstanceInput) => {
      const { base_url, token, verify_token, ...instanceData } = input;

      // 1. Criar instância
      const { data: instance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .insert({
          ...instanceData,
          status: 'disconnected' as const,
        })
        .select()
        .single();

      if (instanceError) throw instanceError;

      // 2. Criar secrets
      const { error: secretsError } = await supabase
        .from('whatsapp_instance_secrets')
        .insert({
          instance_id: instance.id,
          base_url,
          token,
          verify_token,
        });

      if (secretsError) {
        // Rollback: deletar instância
        await supabase.from('whatsapp_instances').delete().eq('id', instance.id);
        throw secretsError;
      }

      return instance as WhatsAppInstance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    },
  });

  const updateInstance = useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<WhatsAppInstance> & { id: string; base_url?: string; token?: string }) => {
      const { base_url, token, ...instanceUpdates } = updates;

      // Atualizar instância
      if (Object.keys(instanceUpdates).length > 0) {
        const { error: instanceError } = await supabase
          .from('whatsapp_instances')
          .update(instanceUpdates)
          .eq('id', id);

        if (instanceError) throw instanceError;
      }

      // Atualizar secrets se fornecidos
      if (base_url || token) {
        const secretsUpdate: Record<string, string> = {};
        if (base_url) secretsUpdate.base_url = base_url;
        if (token) secretsUpdate.token = token;

        const { error: secretsError } = await supabase
          .from('whatsapp_instance_secrets')
          .update(secretsUpdate)
          .eq('instance_id', id);

        if (secretsError) throw secretsError;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteInstance = useMutation({
    mutationFn: async (id: string) => {
      // Chama a edge function que deleta na uazapi e faz soft delete no banco
      const { data, error } = await supabase.functions.invoke('delete-uazapi-instance', {
        body: { instance_id: id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao remover instância');

      // Aviso não-fatal se a uazapi falhou
      if (data.uazapi_error) {
        toast.warning(`Instância removida localmente, mas falhou na uazapi: ${data.uazapi_error}`);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const setDefaultInstance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância padrão definida');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const testConnection = useMutation({
    mutationFn: async (input: {
      base_url: string;
      token: string;
      instance_name: string;
      instance_id_external?: string;
      provider_type: ProviderType;
    }) => {
      const { data, error } = await supabase.functions.invoke('test-uazapi-connection', {
        body: input,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Connection test failed');
      
      return data;
    },
  });

  return {
    instances: instancesQuery.data ?? [],
    isLoading: instancesQuery.isLoading,
    error: instancesQuery.error,
    refetch: instancesQuery.refetch,
    createInstance,
    updateInstance,
    deleteInstance,
    setDefaultInstance,
    testConnection,
  };
}
