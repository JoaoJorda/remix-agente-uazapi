import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Loader2,
  MessageSquare,
  Bot,
  Mic,
  Clock,
  User,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface HealthData {
  results: ValidationResult[];
  overallStatus: 'ok' | 'warning' | 'error';
  summary: {
    ok: number;
    total: number;
    percentage: number;
  };
  message: string;
}

const componentIcons: Record<string, React.ReactNode> = {
  identity: <User className="w-4 h-4" />,
  whatsapp: <MessageSquare className="w-4 h-4" />,
  agent_prompt: <Bot className="w-4 h-4" />,
  elevenlabs: <Mic className="w-4 h-4" />,
  business_hours: <Clock className="w-4 h-4" />,
  lovable_ai: <Sparkles className="w-4 h-4" />,
  pipeline: <Layers className="w-4 h-4" />,
  profile: <User className="w-4 h-4" />,
  nina_settings: <Bot className="w-4 h-4" />,
};

const componentLabels: Record<string, string> = {
  identity: 'Identidade',
  whatsapp: 'WhatsApp',
  agent_prompt: 'Agente IA',
  elevenlabs: 'ElevenLabs',
  business_hours: 'Horário',
  lovable_ai: 'Lovable AI',
  pipeline: 'Pipeline',
  profile: 'Perfil',
  nina_settings: 'Configurações',
};

export const SystemHealthCard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-setup');
      
      if (error) throw error;
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-600';
    }
  };

  const getOverallGradient = (status?: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20';
      case 'warning':
        return 'from-amber-500/10 to-amber-500/5 border-amber-500/20';
      case 'error':
        return 'from-red-500/10 to-red-500/5 border-red-500/20';
      default:
        return 'from-muted to-muted/50 border-border';
    }
  };

  if (loading) {
    return (
      <div className={`rounded-2xl border bg-card border-border p-6`}>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Verificando sistema...</span>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-gradient-to-br ${getOverallGradient(healthData.overallStatus)} p-6 transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(healthData.overallStatus)}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Status do Sistema</h3>
            <p className="text-xs text-muted-foreground">{healthData.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(healthData.overallStatus)}`}>
            {healthData.summary.percentage}% OK
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${healthData.summary.percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${
            healthData.overallStatus === 'ok' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
              : healthData.overallStatus === 'warning'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
              : 'bg-gradient-to-r from-red-500 to-rose-400'
          }`}
        />
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-2 gap-2 mt-2"
        >
          {healthData.results.map((result, index) => (
            <motion.div
              key={result.component}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-2 p-2 rounded-lg border ${getStatusColor(result.status)} bg-opacity-50`}
            >
              <div className="flex-shrink-0">
                {componentIcons[result.component] || <CheckCircle className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {componentLabels[result.component] || result.component}
                </p>
                <p className="text-[10px] opacity-70 truncate">{result.message}</p>
              </div>
              <div className="flex-shrink-0">
                {getStatusIcon(result.status)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
