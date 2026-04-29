import React from 'react';
import { ArrowLeft, Pause, Play, XCircle, CheckCircle, Clock, AlertCircle, Send, Rocket } from 'lucide-react';
import { BroadcastCampaign, BroadcastRecipient, useBroadcasts } from '@/hooks/useBroadcasts';

const renderMessage = (template: string, variables: Record<string, any>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
  });
};
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CampaignDetailsProps {
  campaign: BroadcastCampaign;
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Rascunho', color: 'text-muted-foreground', icon: Clock },
  processing: { label: 'Enviando', color: 'text-primary', icon: Send },
  paused: { label: 'Pausada', color: 'text-yellow-600', icon: Pause },
  completed: { label: 'Concluída', color: 'text-green-600', icon: CheckCircle },
  failed: { label: 'Cancelada', color: 'text-destructive', icon: XCircle },
};

const recipientStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-secondary text-muted-foreground' },
  sent: { label: 'Enviado', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-700' },
  skipped: { label: 'Ignorado', color: 'bg-yellow-100 text-yellow-700' },
};

const CampaignDetails: React.FC<CampaignDetailsProps> = ({ campaign, onBack }) => {
  const { pauseCampaign, resumeCampaign, cancelCampaign, startCampaign } = useBroadcasts();

  const { data: recipients = [] } = useQuery({
    queryKey: ['broadcast-recipients', campaign.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcast_recipients')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BroadcastRecipient[];
    },
    refetchInterval: campaign.status === 'processing' ? 3000 : false,
  });

  const progress = campaign.total_recipients > 0
    ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
    : 0;

  const status = statusConfig[campaign.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">{campaign.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
              <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === 'draft' && (
            <button
              onClick={() => startCampaign.mutate(campaign.id)}
              disabled={startCampaign.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Rocket className="w-4 h-4" />
              Iniciar Disparo
            </button>
          )}
          {campaign.status === 'processing' && (
            <button
              onClick={() => pauseCampaign.mutate(campaign.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          )}
          {campaign.status === 'paused' && (
            <button
              onClick={() => resumeCampaign.mutate(campaign.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              Retomar
            </button>
          )}
          {(campaign.status === 'processing' || campaign.status === 'paused') && (
            <button
              onClick={() => cancelCampaign.mutate(campaign.id)}
              className="flex items-center gap-1.5 px-3 py-2 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="p-6 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Progresso</span>
          <span className="text-sm font-semibold text-foreground">{progress}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-secondary/50 rounded-xl text-center">
            <p className="text-lg font-bold text-foreground">{campaign.total_recipients}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-center">
            <p className="text-lg font-bold text-green-700">{campaign.sent_count}</p>
            <p className="text-xs text-green-600">Enviados</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-center">
            <p className="text-lg font-bold text-red-700">{campaign.failed_count}</p>
            <p className="text-xs text-red-600">Falhas</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-xl text-center">
            <p className="text-lg font-bold text-muted-foreground">
              {campaign.total_recipients - campaign.sent_count - campaign.failed_count}
            </p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </div>
      </div>

      {/* Message template */}
      <div className="px-6 py-4 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Modelo da mensagem
        </p>
        <div className="p-3 bg-secondary/30 rounded-xl border border-border">
          <p className="text-sm font-mono text-foreground whitespace-pre-wrap">{campaign.message_template}</p>
        </div>
      </div>

      {/* Recipients list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-3 bg-secondary/30 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Destinatários ({recipients.length})
          </p>
        </div>

        <div className="divide-y divide-border/50">
          {recipients.map((r) => {
            const rs = recipientStatusConfig[r.status] || recipientStatusConfig.pending;
            return (
              <div key={r.id} className="flex items-center justify-between px-6 py-3 hover:bg-secondary/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.phone_number}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap line-clamp-3">
                    {renderMessage(campaign.message_template, r.variables as Record<string, any>)}
                  </p>
                  {r.error_message && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3 text-destructive" />
                      <p className="text-xs text-destructive truncate">{r.error_message}</p>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rs.color}`}>
                  {rs.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
