import React, { useRef, useState, useEffect } from 'react';
import { Shield, Bot, Plug, Loader2, Save, Lock, Palette, Power } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

import AgentSettings, { AgentSettingsRef } from './settings/AgentSettings';
import ApiSettings, { ApiSettingsRef } from './settings/ApiSettings';
import DesignSettings, { DesignSettingsRef } from './settings/DesignSettings';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from './Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { companyName, isAdmin, loading } = useCompanySettings();
  const agentRef = useRef<AgentSettingsRef>(null);
  const apiRef = useRef<ApiSettingsRef>(null);
  const designRef = useRef<DesignSettingsRef>(null);
  const [activeTab, setActiveTab] = useState('agent');
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('id, agent_enabled')
        .limit(1)
        .maybeSingle();
      if (data) {
        setSettingsId(data.id);
        setAgentEnabled(data.agent_enabled ?? true);
      }
    };
    fetchAgentStatus();
  }, []);

  const handleToggleAgent = async (checked: boolean) => {
    setTogglingAgent(true);
    let error;

    if (settingsId) {
      const result = await supabase
        .from('system_settings')
        .update({ agent_enabled: checked })
        .eq('id', settingsId);
      error = result.error;
    } else {
      const result = await supabase
        .from('system_settings')
        .insert({ agent_enabled: checked })
        .select('id')
        .single();
      error = result.error;
      if (!error && result.data) {
        setSettingsId(result.data.id);
      }
    }

    if (error) {
      toast.error('Erro ao atualizar status do agente');
    } else {
      setAgentEnabled(checked);
      toast.success(checked ? 'Agente ativado' : 'Agente desativado');
    }
    setTogglingAgent(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    if (activeTab === 'agent') {
      await agentRef.current?.save();
    } else if (activeTab === 'apis') {
      await apiRef.current?.save();
    } else if (activeTab === 'design') {
      await designRef.current?.save();
    }
  };

  const handleCancel = () => {
    if (activeTab === 'agent') {
      agentRef.current?.cancel();
    } else if (activeTab === 'apis') {
      apiRef.current?.cancel();
    } else if (activeTab === 'design') {
      designRef.current?.cancel();
    }
  };

  const isSaving = activeTab === 'agent' 
    ? agentRef.current?.isSaving 
    : activeTab === 'apis'
    ? apiRef.current?.isSaving
    : designRef.current?.isSaving;
  
  return (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto bg-background text-foreground custom-scrollbar">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Central de controle da sua instância {companyName}.
            {!isAdmin && (
              <span className="ml-2 text-amber-600">(Somente leitura)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full font-mono flex items-center">
            {isAdmin ? (
              <>
                <Shield className="w-3 h-3 mr-1" /> Admin
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mr-1" /> Somente Leitura
              </>
            )}
          </span>
        </div>
      </div>

      <Tabs defaultValue="agent" className="w-full" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-5">
          <TabsList>
            <TabsTrigger value="agent" className="gap-2">
              <Bot className="w-4 h-4" />
              Agente
            </TabsTrigger>
            <TabsTrigger value="apis" className="gap-2">
              <Plug className="w-4 h-4" />
              APIs
            </TabsTrigger>
            <TabsTrigger value="design" className="gap-2">
              <Palette className="w-4 h-4" />
              Design System
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Power className={`w-4 h-4 ${agentEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <Label htmlFor="agent-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                  {agentEnabled ? 'Agente Ativo' : 'Agente Desligado'}
                </Label>
                <Switch
                  id="agent-toggle"
                  checked={agentEnabled}
                  onCheckedChange={handleToggleAgent}
                  disabled={togglingAgent}
                  className={agentEnabled ? 'data-[state=checked]:bg-emerald-500' : ''}
                />
              </div>

              <div className="w-px h-6 bg-border" />

              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          )}
          
          {!isAdmin && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Lock className="w-4 h-4" />
              Apenas administradores podem editar
            </div>
          )}
        </div>

        <TabsContent value="agent">
          <AgentSettings ref={agentRef} />
        </TabsContent>

        <TabsContent value="apis">
          <ApiSettings ref={apiRef} />
        </TabsContent>

        <TabsContent value="design">
          <DesignSettings ref={designRef} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
