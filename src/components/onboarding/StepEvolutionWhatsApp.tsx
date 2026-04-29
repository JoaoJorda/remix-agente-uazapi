import React, { useState } from 'react';
import { Server, Key, Globe, CheckCircle, Loader2, AlertTriangle, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepEvolutionWhatsAppProps {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  onEvolutionApiUrlChange: (value: string) => void;
  onEvolutionApiKeyChange: (value: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export const StepEvolutionWhatsApp: React.FC<StepEvolutionWhatsAppProps> = ({
  evolutionApiUrl,
  evolutionApiKey,
  onEvolutionApiUrlChange,
  onEvolutionApiKeyChange,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!evolutionApiUrl?.trim() || !evolutionApiKey?.trim()) {
      toast.error('Preencha a URL e Token antes de testar');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-uazapi-connection', {
        body: {
          base_url: evolutionApiUrl.trim(),
          token: evolutionApiKey.trim(),
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ ok: true, message: data.message || 'Conexão estabelecida!' });
        toast.success('uazapi conectada! ✅');
      } else {
        setTestResult({ ok: false, message: data?.error || 'Falha na conexão' });
        toast.error(data?.error || 'Falha na conexão');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setTestResult({ ok: false, message: msg });
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Server className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground mb-2">uazapi</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Configure a conexão com sua uazapi para gerenciar o WhatsApp.
        </p>
      </motion.div>

      <div className="space-y-6 max-w-md mx-auto">
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="evolutionUrl" className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            URL da uazapi
          </Label>
          <Input
            id="evolutionUrl"
            value={evolutionApiUrl}
            onChange={(e) => {
              onEvolutionApiUrlChange(e.target.value);
              setTestResult(null);
            }}
            placeholder="https://sua-instancia.uazapi.com"
            className="font-mono text-sm"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="evolutionKey" className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            Admin Token
          </Label>
          <Input
            id="evolutionKey"
            type="password"
            value={evolutionApiKey}
            onChange={(e) => {
              onEvolutionApiKeyChange(e.target.value);
              setTestResult(null);
            }}
            placeholder="Seu Admin Token da uazapi"
            className="font-mono text-sm"
          />
        </motion.div>

        {/* Test result */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
              testResult.ok
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            {testResult.message}
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !evolutionApiUrl?.trim() || !evolutionApiKey?.trim()}
            className="w-full gap-2"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
