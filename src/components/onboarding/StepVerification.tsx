import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Shield,
  MessageSquare,
  Building2,
  Bot,
  Database,
  Users,
  Mic,
  Clock
} from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

interface HealthCheckResponse {
  success: boolean;
  status: 'ok' | 'warning' | 'error';
  message: string;
  results: HealthCheckResult[];
}

interface StepVerificationProps {
  onAllChecked: (allOk: boolean) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const componentIcons: Record<string, React.ReactNode> = {
  lovable_api_key: <Shield className="w-5 h-5" />,
  whatsapp: <MessageSquare className="w-5 h-5" />,
  identity: <Building2 className="w-5 h-5" />,
  agent_prompt: <Bot className="w-5 h-5" />,
  nina_settings: <Database className="w-5 h-5" />,
  pipeline_stages: <Database className="w-5 h-5" />,
  tag_definitions: <Database className="w-5 h-5" />,
  teams: <Users className="w-5 h-5" />,
  elevenlabs: <Mic className="w-5 h-5" />,
  business_hours: <Clock className="w-5 h-5" />,
};

const componentLabels: Record<string, string> = {
  lovable_api_key: 'Chave de IA',
  whatsapp: 'WhatsApp (Evolution API)',
  identity: 'Identidade da Empresa',
  agent_prompt: 'Prompt do Agente',
  nina_settings: 'Configurações do Sistema',
  pipeline_stages: 'Pipeline de Vendas',
  tag_definitions: 'Definições de Tags',
  teams: 'Equipes',
  elevenlabs: 'Respostas em Áudio',
  business_hours: 'Horário Comercial',
};

export const StepVerification: React.FC<StepVerificationProps> = ({ onAllChecked }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'ok' | 'warning' | 'error' | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<HealthCheckResponse>('health-check');
      
      if (error) {
        console.error('Health check error:', error);
        setResults([{
          component: 'system',
          status: 'error',
          message: 'Erro ao verificar sistema: ' + error.message,
        }]);
        setOverallStatus('error');
        onAllChecked(false);
        return;
      }

      if (data) {
        setResults(data.results);
        setOverallStatus(data.status);
        
        // Check if critical components are OK
        const criticalOk = data.results
          .filter(r => ['lovable_api_key', 'nina_settings', 'pipeline_stages'].includes(r.component))
          .every(r => r.status !== 'error');
        
        onAllChecked(criticalOk);
      }
    } catch (err) {
      console.error('Health check failed:', err);
      setResults([{
        component: 'system',
        status: 'error',
        message: 'Falha ao conectar com o servidor',
      }]);
      setOverallStatus('error');
      onAllChecked(false);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  };

  useEffect(() => {
    // Auto-run health check when component mounts
    runHealthCheck();
  }, []);

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return 'border-green-500/30 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
    }
  };

  const getOverallMessage = () => {
    if (!hasChecked) return null;
    
    switch (overallStatus) {
      case 'ok':
        return (
          <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Sistema totalmente configurado!</span>
            </div>
            <p className="text-sm mt-1 text-green-400/80">Você está pronto para começar a usar o sistema.</p>
          </div>
        );
      case 'warning':
        return (
          <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Sistema funcional com pendências</span>
            </div>
            <p className="text-sm mt-1 text-yellow-400/80">Algumas configurações opcionais estão pendentes.</p>
          </div>
        );
      case 'error':
        return (
          <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Configuração necessária</span>
            </div>
            <p className="text-sm mt-1 text-red-400/80">Complete os itens em vermelho para o sistema funcionar.</p>
          </div>
        );
      default:
        return null;
    }
  };

  // Group results by category
  const criticalResults = results.filter(r => 
    ['lovable_api_key', 'nina_settings', 'pipeline_stages'].includes(r.component)
  );
  const configResults = results.filter(r => 
    ['whatsapp', 'identity', 'agent_prompt'].includes(r.component)
  );
  const optionalResults = results.filter(r => 
    ['teams', 'tag_definitions', 'elevenlabs', 'business_hours'].includes(r.component)
  );

  const renderResultGroup = (title: string, items: HealthCheckResult[]) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-400">{title}</h4>
        <div className="space-y-2">
          {items.map((result, index) => (
            <motion.div
              key={result.component}
              variants={itemVariants}
              className={`p-3 rounded-lg border ${getStatusColor(result.status)} flex items-start gap-3`}
            >
              <div className="mt-0.5">
                {componentIcons[result.component] || <Database className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-white">
                    {componentLabels[result.component] || result.component}
                  </span>
                  {getStatusIcon(result.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {result.message}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white">Verificação do Sistema</h3>
        <p className="text-slate-400 text-sm mt-1">
          Verificando se todos os componentes estão configurados corretamente
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-sm text-slate-400">Verificando sistema...</p>
        </div>
      ) : (
        <>
          {getOverallMessage()}
          
          <div className="space-y-4">
            {renderResultGroup('🔴 Crítico', criticalResults)}
            {renderResultGroup('⚙️ Configuração', configResults)}
            {renderResultGroup('✨ Opcional', optionalResults)}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={runHealthCheck}
              disabled={isLoading}
              className="gap-2 border-violet-500/50 text-violet-400 hover:bg-violet-500/20 hover:text-violet-300"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Verificar Novamente
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
};
