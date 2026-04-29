import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Bot, Loader2, Calendar, Wand2, Building2, RotateCcw, Info, MessageSquare, Brain, Eye, EyeOff, Wifi, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PromptGeneratorSheet from './PromptGeneratorSheet';
import PromptTestModal from './PromptTestModal';
import KnowledgeBase from './KnowledgeBase';
import { DEFAULT_NINA_PROMPT } from '@/prompts/default-nina-prompt';
import { useAuth } from '@/hooks/useAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentSettings {
  id?: string;
  system_prompt_override: string | null;
  is_active: boolean;
  auto_response_enabled: boolean;
  ai_model_mode: 'flash' | 'pro' | 'pro3' | 'adaptive';
  message_breaking_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];
  business_hours_enabled: boolean;
  out_of_hours_message: string;
  timezone: string;
  company_name: string | null;
  sdr_name: string | null;
  ai_scheduling_enabled: boolean;
  custom_ai_provider: string;
  custom_ai_api_key: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
];

// Using shared prompt from @/prompts/default-nina-prompt

export interface AgentSettingsRef {
  save: () => Promise<void>;
  cancel: () => void;
  isSaving: boolean;
}

const AgentSettings = forwardRef<AgentSettingsRef, {}>((props, ref) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [aiProviderTesting, setAiProviderTesting] = useState(false);
  const [aiProviderTestResult, setAiProviderTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>({
    system_prompt_override: null,
    is_active: true,
    auto_response_enabled: true,
    ai_model_mode: 'flash',
    message_breaking_enabled: true,
    business_hours_start: '09:00',
    business_hours_end: '18:00',
    business_days: [1, 2, 3, 4, 5],
    business_hours_enabled: true,
    out_of_hours_message: 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!',
    timezone: 'America/Sao_Paulo',
    company_name: null,
    sdr_name: null,
    ai_scheduling_enabled: true,
    custom_ai_provider: 'lovable',
    custom_ai_api_key: null,
  });

  useImperativeHandle(ref, () => ({
    save: handleSave,
    cancel: loadSettings,
    isSaving: saving
  }));

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch global nina_settings (no user_id filter - single tenant)
      const { data, error } = await supabase
        .from('nina_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Se não existe registro, admin precisa configurar via onboarding
      if (!data) {
        console.log('[AgentSettings] No global settings found');
        setLoading(false);
        return;
      }

      // Load settings from global data
      setSettings({
        id: data.id,
        system_prompt_override: data.system_prompt_override,
        is_active: data.is_active,
        auto_response_enabled: data.auto_response_enabled,
        ai_model_mode: (data.ai_model_mode === 'flash' || data.ai_model_mode === 'pro' || data.ai_model_mode === 'pro3' || data.ai_model_mode === 'adaptive') 
          ? data.ai_model_mode 
          : 'flash',
        message_breaking_enabled: data.message_breaking_enabled,
        business_hours_start: data.business_hours_start,
        business_hours_end: data.business_hours_end,
        business_days: data.business_days,
        business_hours_enabled: (data as any).business_hours_enabled ?? true,
        out_of_hours_message: (data as any).out_of_hours_message || 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!',
        timezone: data.timezone || 'America/Sao_Paulo',
        company_name: data.company_name,
        sdr_name: data.sdr_name,
        ai_scheduling_enabled: data.ai_scheduling_enabled ?? true,
        custom_ai_provider: (data as any).custom_ai_provider || 'lovable',
        custom_ai_api_key: (data as any).custom_ai_api_key ?? null,
      });
    } catch (error) {
      console.error('[AgentSettings] Error loading settings:', error);
      toast.error('Erro ao carregar configurações do agente');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update global settings (no user_id filter needed - RLS handles admin check)
      const { error } = await supabase
        .from('nina_settings')
        .update({
          system_prompt_override: settings.system_prompt_override,
          is_active: settings.is_active,
          auto_response_enabled: settings.auto_response_enabled,
          ai_model_mode: settings.ai_model_mode,
          message_breaking_enabled: settings.message_breaking_enabled,
          business_hours_start: settings.business_hours_start,
          business_hours_end: settings.business_hours_end,
          business_days: settings.business_days,
          business_hours_enabled: settings.business_hours_enabled,
          out_of_hours_message: settings.out_of_hours_message,
          timezone: settings.timezone,
          company_name: settings.company_name,
          sdr_name: settings.sdr_name,
          ai_scheduling_enabled: settings.ai_scheduling_enabled,
          custom_ai_provider: settings.custom_ai_provider,
          custom_ai_api_key: settings.custom_ai_api_key,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', settings.id!);

      if (error) throw error;

      toast.success('Configurações do agente salvas com sucesso!');
    } catch (error) {
      console.error('Error saving agent settings:', error);
      toast.error('Erro ao salvar configurações do agente');
    } finally {
      setSaving(false);
    }
  };

  const toggleBusinessDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      business_days: prev.business_days.includes(day)
        ? prev.business_days.filter(d => d !== day)
        : [...prev.business_days, day].sort()
    }));
  };

  const handlePromptGenerated = (prompt: string) => {
    setSettings(prev => ({ ...prev, system_prompt_override: prompt }));
  };

  const handleTestAiConnection = async () => {
    if (!settings.custom_ai_api_key || settings.custom_ai_provider === 'lovable') {
      toast.error('Selecione um provedor e insira a API Key');
      return;
    }
    setAiProviderTesting(true);
    setAiProviderTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-ai-connection', {
        body: {
          provider: settings.custom_ai_provider,
          api_key: settings.custom_ai_api_key,
        }
      });
      if (error) throw error;
      if (data?.success) {
        setAiProviderTestResult({ ok: true, message: data.message });
        toast.success('Conexão com IA OK! ✅');
      } else {
        setAiProviderTestResult({ ok: false, message: data?.error || 'Falha na conexão' });
        toast.error(data?.error || 'Falha na conexão');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setAiProviderTestResult({ ok: false, message: msg });
      toast.error('Erro ao testar conexão');
    } finally {
      setAiProviderTesting(false);
    }
  };

  const handleRestoreDefault = () => {
    setSettings(prev => ({ ...prev, system_prompt_override: DEFAULT_NINA_PROMPT }));
    toast.success('Prompt restaurado para o padrão');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PromptGeneratorSheet
        open={isGeneratorOpen}
        onOpenChange={setIsGeneratorOpen}
        onPromptGenerated={handlePromptGenerated}
      />
      <PromptTestModal
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        systemPrompt={settings.system_prompt_override || DEFAULT_NINA_PROMPT}
      />
      
      <TooltipProvider>
      <div className="space-y-6">
        {/* System Prompt - PRIMEIRA SEÇÃO */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Prompt do Sistema</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestoreDefault}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Padrão
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTestModalOpen(true)}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Testar Prompt
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGeneratorOpen(true)}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Gerar com IA
              </Button>
            </div>
          </div>
          
          {/* Nota explicativa sobre o prompt */}
          <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <p className="flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Template de exemplo:</strong> Este é um modelo inicial para você começar. 
                Personalize completamente com as informações da sua empresa, produtos, serviços e tom de comunicação.
              </span>
            </p>
          </div>
          
          <textarea
            value={settings.system_prompt_override || ''}
            onChange={(e) => setSettings({ ...settings, system_prompt_override: e.target.value || null })}
            placeholder="Cole ou escreva o prompt do agente aqui..."
            rows={12}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono custom-scrollbar"
          />
          <details className="mt-3">
            <summary className="text-xs text-primary cursor-pointer hover:text-primary/80 flex items-center gap-2">
              <span>📋</span> Variáveis dinâmicas disponíveis
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-muted border border-border text-xs font-mono space-y-1">
              <div><span className="text-primary">{"{{ data_hora }}"}</span> → Data e hora atual (ex: 29/11/2024 14:35:22)</div>
              <div><span className="text-primary">{"{{ data }}"}</span> → Apenas data (ex: 29/11/2024)</div>
              <div><span className="text-primary">{"{{ hora }}"}</span> → Apenas hora (ex: 14:35:22)</div>
              <div><span className="text-primary">{"{{ dia_semana }}"}</span> → Dia da semana por extenso (ex: sexta-feira)</div>
              <div><span className="text-primary">{"{{ cliente_nome }}"}</span> → Nome do cliente na conversa</div>
              <div><span className="text-primary">{"{{ cliente_telefone }}"}</span> → Telefone do cliente</div>
            </div>
          </details>
        </div>

        {/* 2-Column Grid: Company Info + Business Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-foreground">Informações da Empresa</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Nome da Empresa <span className="text-amber-600 text-[10px]">(recomendado)</span>
                </label>
                <input
                  type="text"
                  value={settings.company_name || ''}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value || null })}
                  placeholder="Nome da sua empresa"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Nome do Agente <span className="text-amber-600 text-[10px]">(recomendado)</span>
                </label>
                <input
                  type="text"
                  value={settings.sdr_name || ''}
                  onChange={(e) => setSettings({ ...settings, sdr_name: e.target.value || null })}
                  placeholder="Nome do agente (ex: Ana, Sofia)"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-foreground">Horário de Atendimento</h3>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.business_hours_enabled}
                      onChange={(e) => setSettings({ ...settings, business_hours_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">Quando ativo, o agente só responde dentro do horário configurado. Fora do horário, envia a mensagem automática.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {!settings.business_hours_enabled && (
              <p className="text-xs text-amber-600 mb-3">⚠️ Verificação de horário desativada — o agente responde 24/7</p>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Início</label>
                  <input
                    type="time"
                    value={settings.business_hours_start}
                    onChange={(e) => setSettings({ ...settings, business_hours_start: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fim</label>
                  <input
                    type="time"
                    value={settings.business_hours_end}
                    onChange={(e) => setSettings({ ...settings, business_hours_end: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fuso Horário</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {TIMEZONE_OPTIONS.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Dias da Semana</label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      onClick={() => toggleBusinessDay(day.value)}
                      className={`flex-1 h-9 text-xs font-medium rounded-lg transition-all ${
                        settings.business_days.includes(day.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Mensagem fora do horário
                </label>
                <textarea
                  value={settings.out_of_hours_message}
                  onChange={(e) => setSettings({ ...settings, out_of_hours_message: e.target.value })}
                  placeholder="Mensagem enviada automaticamente fora do horário..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Provedor de IA */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Provedor de IA</h3>
              <p className="text-xs text-muted-foreground">Escolha qual API de IA o agente usará para gerar respostas</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'lovable', label: 'Lovable AI', desc: 'Padrão (sem API Key)', icon: '🤖' },
              { value: 'gemini', label: 'Google Gemini', desc: 'API Key necessária', icon: '💎' },
              { value: 'openai', label: 'OpenAI', desc: 'API Key necessária', icon: '🧠' },
            ].map(provider => (
              <button
                key={provider.value}
                type="button"
                onClick={() => {
                  setSettings(s => ({ ...s, custom_ai_provider: provider.value, custom_ai_api_key: provider.value === 'lovable' ? null : (provider.value === s.custom_ai_provider ? s.custom_ai_api_key : null) }));
                  setAiProviderTestResult(null);
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  settings.custom_ai_provider === provider.value
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                <span className="text-lg">{provider.icon}</span>
                <span className="text-xs font-medium">{provider.label}</span>
                <span className="text-[10px] text-center opacity-70">{provider.desc}</span>
              </button>
            ))}
          </div>

          {settings.custom_ai_provider !== 'lovable' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  API Key ({settings.custom_ai_provider === 'gemini' ? 'Google Gemini' : 'OpenAI'})
                </label>
                <div className="relative">
                  <input
                    type={showAiApiKey ? 'text' : 'password'}
                    placeholder={settings.custom_ai_provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                    value={settings.custom_ai_api_key ?? ''}
                    onChange={e => setSettings(s => ({ ...s, custom_ai_api_key: e.target.value || null }))}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiApiKey(!showAiApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestAiConnection}
                  disabled={aiProviderTesting || !settings.custom_ai_api_key}
                  className="gap-2"
                >
                  {aiProviderTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                  {aiProviderTesting ? 'Testando...' : 'Testar Conexão'}
                </Button>
                {aiProviderTestResult && (
                  <div className={`flex items-center gap-2 text-sm font-medium ${aiProviderTestResult.ok ? 'text-emerald-600' : 'text-destructive'}`}>
                    {aiProviderTestResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {aiProviderTestResult.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Comportamento */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold text-foreground">Comportamento</h3>
          </div>
          
          {/* Toggles em grid 2x2 com tooltips */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-foreground cursor-help flex items-center gap-1.5">
                    Agente Ativo
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">Liga ou desliga o agente de IA completamente. Quando desativado, nenhuma resposta automática será enviada.</p>
                </TooltipContent>
              </Tooltip>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_active}
                  onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-foreground cursor-help flex items-center gap-1.5">
                    Resposta Automática
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">Quando ativo, o agente responde automaticamente sem necessidade de aprovação humana.</p>
                </TooltipContent>
              </Tooltip>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_response_enabled}
                  onChange={(e) => setSettings({ ...settings, auto_response_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-foreground cursor-help flex items-center gap-1.5">
                    Quebrar Mensagens
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">Divide respostas longas em várias mensagens menores, simulando uma conversa mais natural.</p>
                </TooltipContent>
              </Tooltip>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.message_breaking_enabled}
                  onChange={(e) => setSettings({ ...settings, message_breaking_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-foreground cursor-help flex items-center gap-1.5">
                    Agendamento via IA
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">Permite que o agente crie, altere e cancele agendamentos automaticamente durante a conversa.</p>
                </TooltipContent>
              </Tooltip>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ai_scheduling_enabled}
                  onChange={(e) => setSettings({ ...settings, ai_scheduling_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Knowledge Base */}
        <KnowledgeBase />

      </div>
      </TooltipProvider>
    </>
  );
});

AgentSettings.displayName = 'AgentSettings';

export default AgentSettings;