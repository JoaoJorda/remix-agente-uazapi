import React, { useState } from 'react';
import { Plus, Send, Clock, CheckCircle, XCircle, Pause, Loader2 } from 'lucide-react';
import { useBroadcasts, BroadcastCampaign } from '@/hooks/useBroadcasts';
import CampaignWizard from './broadcasts/CampaignWizard';
import CampaignDetails from './broadcasts/CampaignDetails';

type View = 'list' | 'wizard' | 'details';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Rascunho', color: 'text-muted-foreground', bgColor: 'bg-secondary', icon: Clock },
  processing: { label: 'Enviando', color: 'text-primary', bgColor: 'bg-primary/10', icon: Loader2 },
  paused: { label: 'Pausada', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Pause },
  completed: { label: 'Concluída', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  failed: { label: 'Cancelada', color: 'text-destructive', bgColor: 'bg-red-100', icon: XCircle },
};

const Broadcasts: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<BroadcastCampaign | null>(null);
  const { campaigns, isLoading } = useBroadcasts();

  const handleCampaignCreated = (campaign: BroadcastCampaign) => {
    setSelectedCampaign(campaign);
    setView('details');
  };

  const handleSelectCampaign = (campaign: BroadcastCampaign) => {
    setSelectedCampaign(campaign);
    setView('details');
  };

  if (view === 'wizard') {
    return (
      <div className="h-full">
        <CampaignWizard
          onClose={() => setView('list')}
          onCampaignCreated={handleCampaignCreated}
        />
      </div>
    );
  }

  if (view === 'details' && selectedCampaign) {
    // Find the latest version from the query data
    const latestCampaign = campaigns.find(c => c.id === selectedCampaign.id) || selectedCampaign;

    return (
      <div className="h-full">
        <CampaignDetails
          campaign={latestCampaign}
          onBack={() => {
            setSelectedCampaign(null);
            setView('list');
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disparos</h1>
          <p className="text-sm text-muted-foreground mt-1">Campanhas de mensagens em massa via WhatsApp</p>
        </div>
        <button
          onClick={() => setView('wizard')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Campaign list */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma campanha</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crie sua primeira campanha de disparo para enviar mensagens personalizadas em massa via WhatsApp.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const status = statusConfig[campaign.status] || statusConfig.draft;
              const StatusIcon = status.icon;
              const progress = campaign.total_recipients > 0
                ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
                : 0;

              return (
                <button
                  key={campaign.id}
                  onClick={() => handleSelectCampaign(campaign)}
                  className="w-full text-left p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {campaign.name}
                    </h3>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                      <StatusIcon className={`w-3 h-3 ${campaign.status === 'processing' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{campaign.total_recipients} destinatários</span>
                    <span>•</span>
                    <span>{campaign.sent_count} enviados</span>
                    {campaign.failed_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-destructive">{campaign.failed_count} falhas</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{new Date(campaign.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {(campaign.status === 'processing' || campaign.status === 'paused') && (
                    <div className="mt-3 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Broadcasts;
