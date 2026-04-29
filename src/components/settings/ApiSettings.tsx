import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { Save, MessageSquare, Mic, Eye, EyeOff, Copy, Check, Loader2, Send, ChevronDown, Volume2, Download, Upload, FileAudio, HelpCircle, Smartphone, Wifi, WifiOff, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppInstancesManager } from './WhatsAppInstancesManager';

interface NinaSettings {
  id?: string;
  whatsapp_access_token: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_verify_token: string | null;
  elevenlabs_api_key: string | null;
  elevenlabs_voice_id: string;
  elevenlabs_model: string | null;
  elevenlabs_stability: number;
  elevenlabs_similarity_boost: number;
  elevenlabs_style: number;
  elevenlabs_speed: number | null;
  elevenlabs_speaker_boost: boolean;
  audio_response_enabled: boolean;
  uazapi_base_url: string | null;
  uazapi_token: string | null;
}

const VOICE_OPTIONS = [
  { id: '33B4UnXyTNbgLmdEDh5P', name: 'Keren - Young Brazilian Female', desc: 'Feminina, brasileira (Padrão)' },
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', desc: 'Feminina, natural' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', desc: 'Masculina, confiante' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Feminina, suave' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', desc: 'Feminina, expressiva' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', desc: 'Masculina, casual' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Masculina, britânica' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', desc: 'Masculina, transatlântica' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', desc: 'Não-binária, americana' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', desc: 'Masculina, articulada' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', desc: 'Feminina, sueca' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', desc: 'Feminina, britânica' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', desc: 'Feminina, calorosa' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', desc: 'Masculina, amigável' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', desc: 'Feminina, expressiva' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', desc: 'Masculina, amigável' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', desc: 'Masculina, casual' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', desc: 'Masculina, profunda' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Masculina, britânica' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Feminina, britânica' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', desc: 'Masculina, americana' },
];

const MODEL_OPTIONS = [
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5 (Recomendado)' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2' },
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2' },
];

export interface ApiSettingsRef {
  save: () => Promise<void>;
  cancel: () => void;
  isSaving: boolean;
}

const ApiSettings = forwardRef<ApiSettingsRef>((props, ref) => {
  const { companyName } = useCompanySettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [showUazapiToken, setShowUazapiToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [advancedVoiceOpen, setAdvancedVoiceOpen] = useState(false);
  const [testSectionOpen, setTestSectionOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [uazapiTesting, setUazapiTesting] = useState(false);
  const [uazapiTestResult, setUazapiTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  

  // Audio test states
  const [audioTestOpen, setAudioTestOpen] = useState(false);
  const [audioTestText, setAudioTestText] = useState('Olá! Esta é uma mensagem de teste para verificar a qualidade da voz.');
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioStats, setAudioStats] = useState<{ duration_ms: number; size_kb: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Audio simulation states
  const [audioSimulateOpen, setAudioSimulateOpen] = useState(false);
  const [audioSimulatePhone, setAudioSimulatePhone] = useState('');
  const [audioSimulateName, setAudioSimulateName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioSimulating, setAudioSimulating] = useState(false);
  const [audioSimulateResult, setAudioSimulateResult] = useState<{
    transcription: string;
    contact_id: string;
    conversation_id: string;
    message_id: string;
    queued_for_nina: boolean;
  } | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  
  // Gera um verify token único para esta instalação
  const generateUniqueToken = () => `verify-${crypto.randomUUID().slice(0, 8)}`;
  
  const [settings, setSettings] = useState<NinaSettings>({
    whatsapp_access_token: null,
    whatsapp_phone_number_id: null,
    whatsapp_verify_token: generateUniqueToken(),
    elevenlabs_api_key: null,
    elevenlabs_voice_id: '33B4UnXyTNbgLmdEDh5P',
    elevenlabs_model: 'eleven_turbo_v2_5',
    elevenlabs_stability: 0.75,
    elevenlabs_similarity_boost: 0.80,
    elevenlabs_style: 0.30,
    elevenlabs_speed: 1.0,
    elevenlabs_speaker_boost: true,
    audio_response_enabled: false,
    uazapi_base_url: null,
    uazapi_token: null,
  });

  // Auto-save ElevenLabs API key when field loses focus
  const handleElevenLabsKeyBlur = async () => {
    if (!settings.id || !settings.elevenlabs_api_key) return;
    
    try {
      const { error } = await supabase
        .from('nina_settings')
        .update({
          elevenlabs_api_key: settings.elevenlabs_api_key,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('API Key da ElevenLabs salva automaticamente');
    } catch (error) {
      console.error('Error auto-saving ElevenLabs key:', error);
    }
  };

  // Auto-save uazapi credentials when fields lose focus
  const handleUazapiBlur = async () => {
    if (!settings.id) return;
    if (!settings.uazapi_base_url && !settings.uazapi_token) return;

    try {
      const { error } = await supabase
        .from('nina_settings')
        .update({
          uazapi_base_url: settings.uazapi_base_url,
          uazapi_token: settings.uazapi_token,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('uazapi salva automaticamente');
    } catch (error) {
      console.error('Error auto-saving uazapi settings:', error);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  useEffect(() => {
    setTestMessage(`Olá! Esta é uma mensagem de teste do sistema ${companyName}. 🚀`);
  }, [companyName]);

  useEffect(() => {
    loadSettings();
  }, []);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    cancel: loadSettings,
    isSaving: saving
  }));

  const loadSettings = async () => {
    if (!user?.id) {
      console.log('[ApiSettings] No user, skipping load');
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
        console.log('[ApiSettings] No global settings found');
        setLoading(false);
        return;
      }

      // Load settings from global data
      const uniqueToken = data.whatsapp_verify_token || generateUniqueToken();
      setSettings({
        id: data.id,
        whatsapp_access_token: data.whatsapp_access_token,
        whatsapp_phone_number_id: data.whatsapp_phone_number_id,
        whatsapp_verify_token: uniqueToken,
        elevenlabs_api_key: data.elevenlabs_api_key,
        elevenlabs_voice_id: data.elevenlabs_voice_id,
        elevenlabs_model: data.elevenlabs_model,
        elevenlabs_stability: data.elevenlabs_stability,
        elevenlabs_similarity_boost: data.elevenlabs_similarity_boost,
        elevenlabs_style: data.elevenlabs_style,
        elevenlabs_speed: data.elevenlabs_speed,
        elevenlabs_speaker_boost: data.elevenlabs_speaker_boost,
        audio_response_enabled: data.audio_response_enabled || false,
        uazapi_base_url: (data as any).uazapi_base_url ?? null,
        uazapi_token: (data as any).uazapi_token ?? null,
      });
    } catch (error) {
      console.error('[ApiSettings] Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.whatsapp_phone_number_id && !/^\d+$/.test(settings.whatsapp_phone_number_id)) {
        toast.error('Phone Number ID deve conter apenas números');
        return;
      }

      // Update global settings (no user_id filter - RLS handles admin check)
      const { error } = await supabase
        .from('nina_settings')
        .update({
          whatsapp_access_token: settings.whatsapp_access_token,
          whatsapp_phone_number_id: settings.whatsapp_phone_number_id,
          whatsapp_verify_token: settings.whatsapp_verify_token,
          elevenlabs_api_key: settings.elevenlabs_api_key,
          elevenlabs_voice_id: settings.elevenlabs_voice_id,
          elevenlabs_model: settings.elevenlabs_model,
          elevenlabs_stability: settings.elevenlabs_stability,
          elevenlabs_similarity_boost: settings.elevenlabs_similarity_boost,
          elevenlabs_style: settings.elevenlabs_style,
          elevenlabs_speed: settings.elevenlabs_speed,
          elevenlabs_speaker_boost: settings.elevenlabs_speaker_boost,
          audio_response_enabled: settings.audio_response_enabled,
          uazapi_base_url: settings.uazapi_base_url,
          uazapi_token: settings.uazapi_token,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', settings.id!);

      if (error) throw error;

      toast.success('Configurações de APIs salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('URL do webhook copiada!');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleTestUazapiConnection = async () => {
    if (!settings.uazapi_base_url || !settings.uazapi_token) {
      toast.error('Preencha a URL e o Token da uazapi antes de testar');
      return;
    }
    setUazapiTesting(true);
    setUazapiTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-uazapi-connection', {
        body: {
          base_url: settings.uazapi_base_url,
          token: settings.uazapi_token,
        }
      });

      if (error) throw error;

      if (data?.success) {
        setUazapiTestResult({ ok: true, message: 'Conexão com a uazapi estabelecida!' });
        toast.success('uazapi conectada! ✅');
      } else {
        setUazapiTestResult({ ok: false, message: data?.error || 'Não foi possível conectar à uazapi.' });
        toast.error('Falha na conexão');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setUazapiTestResult({ ok: false, message: msg });
      toast.error('Erro ao testar conexão');
    } finally {
      setUazapiTesting(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!settings.elevenlabs_api_key) {
      toast.error('Configure sua API Key da ElevenLabs primeiro');
      return;
    }

    if (!audioTestText.trim()) {
      toast.error('Insira um texto para converter em áudio');
      return;
    }

    setAudioGenerating(true);
    setAudioUrl(null);
    setAudioStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-elevenlabs-tts', {
        body: { 
          text: audioTestText,
          apiKey: settings.elevenlabs_api_key,
          voiceId: settings.elevenlabs_voice_id,
          model: settings.elevenlabs_model,
          stability: settings.elevenlabs_stability,
          similarityBoost: settings.elevenlabs_similarity_boost,
          speed: settings.elevenlabs_speed,
        }
      });

      if (error) throw error;

      if (data?.success && data?.audioBase64) {
        // Create audio URL from base64
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioStats({ duration_ms: data.duration_ms, size_kb: data.size_kb });
        toast.success(`Áudio gerado em ${(data.duration_ms / 1000).toFixed(1)}s`);
      } else {
        throw new Error(data?.error || 'Erro ao gerar áudio');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar áudio';
      toast.error(errorMessage);
    } finally {
      setAudioGenerating(false);
    }
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'elevenlabs-test.mp3';
    a.click();
  };

  const handleTestMessage = async () => {
    if (!testPhone.trim()) {
      toast.error('Insira um número de telefone');
      return;
    }

    if (!testMessage.trim()) {
      toast.error('Insira uma mensagem');
      return;
    }

    const cleanPhone = testPhone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      toast.error('O número deve estar no formato internacional (ex: 5511999999999)');
      return;
    }

    setTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-whatsapp-message', {
        body: {
          phone_number: cleanPhone,
          message: testMessage
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Mensagem enviada com sucesso! ✅', {
          description: `ID: ${data.message_id}`
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem de teste';
      toast.error('Falha ao enviar mensagem', {
        description: errorMessage
      });
    } finally {
      setTestSending(false);
    }
  };

  const handleSimulateAudioWebhook = async () => {
    if (!audioSimulatePhone.trim()) {
      toast.error('Insira um número de telefone');
      return;
    }

    if (!audioFile) {
      toast.error('Selecione um arquivo de áudio');
      return;
    }

    // Validate phone format
    const cleanPhone = audioSimulatePhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Número de telefone inválido');
      return;
    }

    setAudioSimulating(true);
    setAudioSimulateResult(null);

    try {
      // Convert file to base64
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const { data, error } = await supabase.functions.invoke('simulate-audio-webhook', {
        body: {
          phone: cleanPhone,
          name: audioSimulateName.trim() || undefined,
          audio_base64: base64,
          audio_mime_type: audioFile.type || 'audio/ogg'
        }
      });

      if (error) throw error;

      if (data?.success) {
        setAudioSimulateResult({
          transcription: data.transcription,
          contact_id: data.contact_id,
          conversation_id: data.conversation_id,
          message_id: data.message_id,
          queued_for_nina: data.queued_for_nina
        });
        toast.success('Áudio simulado com sucesso!', {
          description: `Transcrição: "${data.transcription?.substring(0, 50)}..."`
        });
      } else {
        throw new Error(data?.error || 'Erro ao simular áudio');
      }
    } catch (error) {
      console.error('Error simulating audio webhook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao simular recebimento de áudio';
      toast.error('Falha na simulação', {
        description: errorMessage
      });
    } finally {
      setAudioSimulating(false);
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/mp4'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(ogg|mp3|wav|m4a|webm|mp4)$/i)) {
        toast.error('Formato de áudio não suportado', {
          description: 'Use .ogg, .mp3, .wav, .m4a ou .webm'
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande', {
          description: 'O arquivo deve ter no máximo 10MB'
        });
        return;
      }
      
      setAudioFile(file);
      setAudioSimulateResult(null);
    }
  };

  

  const elevenlabsConfigured = settings.elevenlabs_api_key;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* uazapi — Configuração Global */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">uazapi</h3>
            <p className="text-xs text-muted-foreground">Configure as credenciais globais para criar instâncias WhatsApp</p>
          </div>
          <div className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
            settings.uazapi_base_url && settings.uazapi_token
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
          }`}>
            <span className={`h-2 w-2 rounded-full ${settings.uazapi_base_url && settings.uazapi_token ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {settings.uazapi_base_url && settings.uazapi_token ? 'Admin Token registrado' : 'Admin Token não configurado'}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">URL da uazapi</label>
            <input
              type="url"
              placeholder="https://plasacademy.uazapi.com"
              value={settings.uazapi_base_url ?? ''}
              onChange={e => setSettings(s => ({ ...s, uazapi_base_url: e.target.value || null }))}
              onBlur={handleUazapiBlur}
              className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Token da Instância</label>
            <div className="relative">
              <input
                type={showUazapiToken ? 'text' : 'password'}
                placeholder="Seu Admin Token da uazapi"
                value={settings.uazapi_token ?? ''}
                onChange={e => setSettings(s => ({ ...s, uazapi_token: e.target.value || null }))}
                onBlur={handleUazapiBlur}
                className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowUazapiToken(!showUazapiToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showUazapiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">As credenciais são salvas automaticamente ao sair do campo</p>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestUazapiConnection}
              disabled={uazapiTesting || !settings.uazapi_base_url || !settings.uazapi_token}
              className="gap-2"
            >
              {uazapiTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              {uazapiTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>

            {uazapiTestResult && (
              <div className={`flex items-center gap-2 text-sm font-medium ${uazapiTestResult.ok ? 'text-emerald-600' : 'text-destructive'}`}>
                {uazapiTestResult.ok
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <XCircle className="w-4 h-4 shrink-0" />
                }
                <span>{uazapiTestResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* uazapi Instances */}
      <div className="rounded-xl border border-border bg-card p-6">
        <WhatsAppInstancesManager
          uazapiBaseUrl={settings.uazapi_base_url}
          uazapiToken={settings.uazapi_token}
        />
      </div>


      {/* ElevenLabs */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold text-foreground">ElevenLabs (Text-to-Speech)</h3>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
            elevenlabsConfigured 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            <span className={`h-2 w-2 rounded-full ${elevenlabsConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {elevenlabsConfigured ? 'Configurado' : 'Aguardando'}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">API Key</label>
            <div className="relative">
              <input
                type={showElevenLabsKey ? "text" : "password"}
                value={settings.elevenlabs_api_key || ''}
                onChange={(e) => setSettings({ ...settings, elevenlabs_api_key: e.target.value })}
                onBlur={handleElevenLabsKeyBlur}
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <button
                type="button"
                onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showElevenLabsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Voz</label>
              <select
                value={settings.elevenlabs_voice_id}
                onChange={(e) => setSettings({ ...settings, elevenlabs_voice_id: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {VOICE_OPTIONS.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name} - {voice.desc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Modelo</label>
              <select
                value={settings.elevenlabs_model || 'eleven_turbo_v2_5'}
                onChange={(e) => setSettings({ ...settings, elevenlabs_model: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {MODEL_OPTIONS.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio Response Toggle */}
          <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-medium text-foreground">Respostas em Áudio</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Quando ativado, o agente responderá com áudios em vez de texto
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.audio_response_enabled}
                  onChange={(e) => setSettings({ ...settings, audio_response_enabled: e.target.checked })}
                  disabled={!elevenlabsConfigured}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500 ${!elevenlabsConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
              </label>
            </div>
            {!elevenlabsConfigured && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Configure a API Key da ElevenLabs para habilitar respostas em áudio
              </p>
            )}
            {settings.audio_response_enabled && elevenlabsConfigured && (
              <p className="text-xs text-emerald-600 mt-2">
                ✅ Áudios recebidos serão transcritos automaticamente e o agente responderá com áudio
              </p>
            )}
          </div>

          {/* Advanced Voice Settings Collapsible */}
          <Collapsible.Root open={advancedVoiceOpen} onOpenChange={setAdvancedVoiceOpen}>
            <Collapsible.Trigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedVoiceOpen ? 'rotate-180' : ''}`} />
              Configurações Avançadas de Voz
            </Collapsible.Trigger>
            <Collapsible.Content className="mt-3 p-4 bg-muted rounded-lg border border-border space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-muted-foreground">Stability</label>
                    <span className="text-xs font-mono text-foreground">{settings.elevenlabs_stability.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.elevenlabs_stability}
                    onChange={(e) => setSettings({ ...settings, elevenlabs_stability: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-muted-foreground">Similarity</label>
                    <span className="text-xs font-mono text-foreground">{settings.elevenlabs_similarity_boost.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.elevenlabs_similarity_boost}
                    onChange={(e) => setSettings({ ...settings, elevenlabs_similarity_boost: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-muted-foreground">Style</label>
                    <span className="text-xs font-mono text-foreground">{settings.elevenlabs_style.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.elevenlabs_style}
                    onChange={(e) => setSettings({ ...settings, elevenlabs_style: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-muted-foreground">Speed</label>
                    <span className="text-xs font-mono text-foreground">{settings.elevenlabs_speed?.toFixed(1) || '1.0'}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={settings.elevenlabs_speed || 1.0}
                    onChange={(e) => setSettings({ ...settings, elevenlabs_speed: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.elevenlabs_speaker_boost}
                    onChange={(e) => setSettings({ ...settings, elevenlabs_speaker_boost: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                </label>
                <span className="text-sm text-foreground">Speaker Boost</span>
              </div>
            </Collapsible.Content>
          </Collapsible.Root>

          {/* Audio Test Section */}
          <Collapsible.Root open={audioTestOpen} onOpenChange={setAudioTestOpen} className="mt-4">
            <Collapsible.Trigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform ${audioTestOpen ? 'rotate-180' : ''}`} />
              <Volume2 className="w-4 h-4" />
              Testar Áudio
            </Collapsible.Trigger>
            <Collapsible.Content className="mt-3 p-4 bg-muted rounded-lg border border-border space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Texto para converter em áudio</label>
                <textarea
                  value={audioTestText}
                  onChange={(e) => setAudioTestText(e.target.value)}
                  placeholder="Digite o texto que deseja converter em áudio..."
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{audioTestText.length}/1000 caracteres</p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerateAudio}
                  disabled={audioGenerating || !settings.elevenlabs_api_key}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {audioGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      Gerar e Ouvir
                    </>
                  )}
                </Button>

                {audioUrl && (
                  <Button
                    onClick={handleDownloadAudio}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Baixar
                  </Button>
                )}
              </div>

              {!settings.elevenlabs_api_key && (
                <p className="text-xs text-amber-600">
                  ⚠️ Configure sua API Key da ElevenLabs acima para testar
                </p>
              )}

              {audioUrl && (
                <div className="space-y-2">
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    className="w-full h-10"
                    autoPlay
                  />
                  {audioStats && (
                    <p className="text-xs text-muted-foreground">
                      ✅ Gerado em {(audioStats.duration_ms / 1000).toFixed(1)}s • {audioStats.size_kb}KB
                    </p>
                  )}
                </div>
              )}
            </Collapsible.Content>
          </Collapsible.Root>
        </div>
      </div>

      {/* Test Message Collapsible */}
      <Collapsible.Root open={testSectionOpen} onOpenChange={setTestSectionOpen}>
        <div className="rounded-xl border border-border bg-card p-6">
          <Collapsible.Trigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors w-full">
            <Send className="w-4 h-4" />
            <span>Teste de Envio</span>
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${testSectionOpen ? 'rotate-180' : ''}`} />
          </Collapsible.Trigger>
          <Collapsible.Content className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Telefone</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+5511999999999"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensagem</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Mensagem de teste..."
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleTestMessage}
                disabled={testSending}
                className="shadow-lg shadow-primary/20"
              >
                {testSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Teste
                  </>
                )}
              </Button>
            </div>
          </Collapsible.Content>
        </div>
      </Collapsible.Root>

      {/* Simulate Audio Reception - Seção Avançada (escondida por padrão) */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 py-2">
          <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
          Ferramentas Avançadas de Teste
        </summary>
        <div className="mt-2">
      <Collapsible.Root open={audioSimulateOpen} onOpenChange={setAudioSimulateOpen}>
        <div className="rounded-xl border border-amber-200 bg-card p-6">
          <Collapsible.Trigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors w-full">
            <FileAudio className="w-4 h-4 text-amber-600" />
            <span>Simular Recebimento de Áudio</span>
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${audioSimulateOpen ? 'rotate-180' : ''}`} />
          </Collapsible.Trigger>
          <Collapsible.Content className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Simula o recebimento de um áudio pelo WhatsApp. O áudio será transcrito e processado pela IA.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Telefone do Contato *</label>
                <input
                  type="tel"
                  value={audioSimulatePhone}
                  onChange={(e) => setAudioSimulatePhone(e.target.value)}
                  placeholder="5511999999999"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome do Contato (opcional)</label>
                <input
                  type="text"
                  value={audioSimulateName}
                  onChange={(e) => setAudioSimulateName(e.target.value)}
                  placeholder="João da Silva"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Arquivo de Áudio *</label>
              <div 
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  audioFile 
                    ? 'border-amber-400 bg-amber-50' 
                    : 'border-border hover:border-muted-foreground bg-muted'
                }`}
                onClick={() => audioFileInputRef.current?.click()}
              >
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept=".ogg,.mp3,.wav,.m4a,.webm,audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                />
                {audioFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileAudio className="w-5 h-5 text-amber-600" />
                    <div className="text-left">
                      <p className="text-sm text-foreground">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(audioFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAudioFile(null);
                        setAudioSimulateResult(null);
                      }}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique ou arraste um arquivo de áudio</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">.ogg, .mp3, .wav, .m4a, .webm (máx 10MB)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSimulateAudioWebhook}
                disabled={audioSimulating || !audioFile || !audioSimulatePhone.trim()}
                className="bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20"
              >
                {audioSimulating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileAudio className="w-4 h-4 mr-2" />
                    Simular Áudio Recebido
                  </>
                )}
              </Button>
            </div>

            {/* Result Display */}
            {audioSimulateResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Áudio processado com sucesso!</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Transcrição:</span>
                    <p className="text-foreground mt-1 p-2 bg-background rounded border border-border">
                      "{audioSimulateResult.transcription}"
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Contact ID:</span>
                      <p className="text-foreground font-mono">{audioSimulateResult.contact_id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conversation ID:</span>
                      <p className="text-foreground font-mono">{audioSimulateResult.conversation_id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Message ID:</span>
                      <p className="text-foreground font-mono">{audioSimulateResult.message_id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nina:</span>
                      <p className={audioSimulateResult.queued_for_nina ? 'text-emerald-600' : 'text-amber-600'}>
                        {audioSimulateResult.queued_for_nina ? '✅ Processando' : '⏸️ Não enfileirado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Collapsible.Content>
        </div>
      </Collapsible.Root>
        </div>
      </details>
    </div>
  );
});

ApiSettings.displayName = 'ApiSettings';

export default ApiSettings;