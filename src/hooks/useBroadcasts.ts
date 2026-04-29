import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface BroadcastCampaign {
  id: string;
  user_id: string;
  name: string;
  message_template: string;
  message_type: string;
  media_url: string | null;
  instance_id: string;
  delay_min_ms: number;
  delay_max_ms: number;
  batch_size: number;
  delay_between_batches: number;
  next_batch_at: string | null;
  column_mapping: Record<string, string>;
  custom_fields: string[];
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastRecipient {
  id: string;
  campaign_id: string;
  phone_number: string;
  variables: Record<string, any>;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface CreateCampaignInput {
  name: string;
  message_template: string;
  message_type?: string;
  media_url?: string;
  instance_id?: string;
  delay_min_ms: number;
  delay_max_ms: number;
  batch_size: number;
  delay_between_batches: number;
  column_mapping: Record<string, string>;
  custom_fields: string[];
  recipients: Array<{
    phone_number: string;
    variables: Record<string, any>;
  }>;
}

export function useBroadcasts() {
  const queryClient = useQueryClient();

  // List campaigns
  const campaignsQuery = useQuery({
    queryKey: ['broadcast-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcast_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BroadcastCampaign[];
    },
  });

  // Realtime subscription for campaign updates
  useEffect(() => {
    const channel = supabase
      .channel('broadcast-campaigns-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcast_campaigns',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create campaign + recipients
  const createCampaign = useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { recipients, ...campaignData } = input;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('broadcast_campaigns')
        .insert({
          ...campaignData,
          user_id: user.id,
          total_recipients: recipients.length,
          status: 'draft',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Insert recipients in batches of 500
      const BATCH = 500;
      for (let i = 0; i < recipients.length; i += BATCH) {
        const batch = recipients.slice(i, i + BATCH).map(r => ({
          campaign_id: campaign.id,
          phone_number: r.phone_number,
          variables: r.variables,
        }));

        const { error: recipientsError } = await supabase
          .from('broadcast_recipients')
          .insert(batch);

        if (recipientsError) throw recipientsError;
      }

      return campaign as BroadcastCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Campanha criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    },
  });

  // Start campaign (invoke edge function)
  const startCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('broadcast-processor', {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Disparo iniciado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao iniciar disparo: ${error.message}`);
    },
  });

  // Pause campaign
  const pauseCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('broadcast_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Campanha pausada');
    },
  });

  // Resume campaign
  const resumeCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'processing' })
        .eq('id', campaignId);

      const { data, error } = await supabase.functions.invoke('broadcast-processor', {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Campanha retomada!');
    },
  });

  // Cancel campaign
  const cancelCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('broadcast_campaigns')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Campanha cancelada');
    },
  });

  // Get recipients for a campaign
  const useRecipients = (campaignId: string | null) => {
    return useQuery({
      queryKey: ['broadcast-recipients', campaignId],
      queryFn: async () => {
        if (!campaignId) return [];
        const { data, error } = await supabase
          .from('broadcast_recipients')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as BroadcastRecipient[];
      },
      enabled: !!campaignId,
    });
  };

  return {
    campaigns: campaignsQuery.data ?? [],
    isLoading: campaignsQuery.isLoading,
    error: campaignsQuery.error,
    refetch: campaignsQuery.refetch,
    createCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,
    useRecipients,
  };
}
