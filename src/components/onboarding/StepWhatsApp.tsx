import React, { useState, useEffect } from 'react';
import { MessageSquare, Key, Phone, ExternalLink, Copy, Check, ChevronDown, Building2, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/Button';

interface StepWhatsAppProps {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  onAccessTokenChange: (value: string) => void;
  onPhoneNumberIdChange: (value: string) => void;
  onBusinessAccountIdChange: (value: string) => void;
  onVerifyTokenChange: (value: string) => void;
  webhookUrl: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
};

// Generate a unique verify token
const generateVerifyToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'viver-ia-';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const StepWhatsApp: React.FC<StepWhatsAppProps> = ({
  accessToken,
  phoneNumberId,
  businessAccountId,
  verifyToken,
  onAccessTokenChange,
  onPhoneNumberIdChange,
  onBusinessAccountIdChange,
  onVerifyTokenChange,
  webhookUrl,
}) => {
  const [showWebhook, setShowWebhook] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Auto-generate verify token if empty or default
  useEffect(() => {
    if (!verifyToken || verifyToken === 'viver-de-ia-nina-webhook') {
      onVerifyTokenChange(generateVerifyToken());
    }
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const regenerateToken = () => {
    onVerifyTokenChange(generateVerifyToken());
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <MessageSquare className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground mb-2">WhatsApp Cloud API</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Conecte sua conta do WhatsApp Business para enviar e receber mensagens.
        </p>
      </motion.div>

      <div className="space-y-6 max-w-md mx-auto">
        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="accessToken" className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            Access Token
          </Label>
          <Input
            id="accessToken"
            type="password"
            value={accessToken}
            onChange={(e) => onAccessTokenChange(e.target.value)}
            placeholder="EAAxxxxxxxx..."
            className="font-mono text-sm focus:ring-emerald-500"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="phoneNumberId" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Phone Number ID
          </Label>
          <Input
            id="phoneNumberId"
            value={phoneNumberId}
            onChange={(e) => onPhoneNumberIdChange(e.target.value)}
            placeholder="123456789012345"
            className="font-mono text-sm focus:ring-emerald-500"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="businessAccountId" className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Business Account ID (WABA)
          </Label>
          <Input
            id="businessAccountId"
            value={businessAccountId}
            onChange={(e) => onBusinessAccountIdChange(e.target.value)}
            placeholder="123456789012345"
            className="font-mono text-sm focus:ring-emerald-500"
          />
          <p className="text-xs text-muted-foreground">
            Encontrado em Meta Business Suite → Configurações → WhatsApp Accounts
          </p>
        </motion.div>

        {/* Webhook Configuration (Collapsible) */}
        <motion.div variants={itemVariants} className="pt-4 border-t border-border">
          <motion.button
            onClick={() => setShowWebhook(!showWebhook)}
            whileHover={{ x: 4 }}
            className="flex items-center justify-between w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Configuração de Webhook
            </span>
            <motion.div
              animate={{ rotate: showWebhook ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showWebhook && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="bg-background border-border font-mono text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(webhookUrl, 'url')}
                        className="px-3"
                      >
                        {copied === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verifyToken" className="text-muted-foreground text-xs flex items-center gap-2">
                      Verify Token
                      <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                        <Sparkles className="w-3 h-3" />
                        Auto-gerado
                      </span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="verifyToken"
                        value={verifyToken}
                        readOnly
                        className="bg-background border-border font-mono text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(verifyToken, 'token')}
                        className="px-3"
                        disabled={!verifyToken}
                      >
                        {copied === 'token' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={regenerateToken}
                        className="px-3"
                        title="Regenerar token"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Token gerado automaticamente. Use este mesmo valor no Meta Business.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-primary font-medium mb-2">Como configurar:</p>
                    <ol className="text-xs text-primary/80 space-y-1 list-decimal list-inside">
                      <li>Copie a Webhook URL e o Verify Token</li>
                      <li>Acesse o <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Meta Business Dashboard</a></li>
                      <li>Vá em WhatsApp → Configuration → Webhook</li>
                      <li>Cole os valores e selecione: messages, message_echoes</li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Tutorial Link */}
      <motion.div variants={itemVariants} className="text-center pt-4">
        <motion.a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Como obter as credenciais do WhatsApp
        </motion.a>
      </motion.div>
    </motion.div>
  );
};
