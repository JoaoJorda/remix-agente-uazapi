import React from 'react';
import { Bot, Wand2, Cpu, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepAgentProps {
  systemPrompt: string;
  aiModelMode: string;
  onSystemPromptChange: (value: string) => void;
  onAiModelModeChange: (value: string) => void;
  onGeneratePrompt: () => void;
  isGenerating?: boolean;
}

const AI_MODELS = [
  { value: 'flash', label: 'Gemini 3 Flash', description: 'Rápido e econômico' },
  { value: 'pro', label: 'Gemini Pro 2.5', description: 'Mais inteligente' },
  { value: 'pro3', label: 'Gemini Pro 3', description: 'Última geração' },
  { value: 'adaptive', label: 'Modo Adaptativo', description: 'Alterna automaticamente' },
];

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

export const StepAgent: React.FC<StepAgentProps> = ({
  systemPrompt,
  aiModelMode,
  onSystemPromptChange,
  onAiModelModeChange,
  onGeneratePrompt,
  isGenerating = false,
}) => {
  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Bot className="w-8 h-8 text-accent" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Configurar Agente</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Defina a personalidade e comportamento do seu agente de IA.
        </p>
      </motion.div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* AI Model Selection */}
        <motion.div variants={itemVariants} className="space-y-2">
          <Label className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            Modelo de IA
          </Label>
          <Select value={aiModelMode} onValueChange={onAiModelModeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem 
                  key={model.value} 
                  value={model.value}
                >
                  <div className="flex flex-col">
                    <span>{model.label}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* System Prompt */}
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="systemPrompt" className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-muted-foreground" />
              Prompt do Sistema
            </Label>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onGeneratePrompt}
                disabled={isGenerating}
                className="text-xs text-accent hover:text-accent/80 gap-1"
              >
                <Wand2 className="w-3 h-3" />
                {isGenerating ? 'Gerando...' : 'Gerar com IA'}
              </Button>
            </motion.div>
          </div>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Descreva como o agente deve se comportar, qual seu tom de voz, objetivos, e informações importantes sobre a empresa..."
            className="min-h-[200px] resize-none focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground">
            Use variáveis como {'{{ cliente_nome }}'}, {'{{ data_hora }}'} para personalização dinâmica.
          </p>
        </motion.div>

        {/* Quick Tips */}
        <motion.div 
          variants={itemVariants}
          className="p-4 rounded-xl bg-secondary/30 border border-border"
        >
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent" />
            Dicas para um bom prompt
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Defina claramente o objetivo do agente (vendas, suporte, etc)</li>
            <li>• Especifique o tom de voz (formal, casual, amigável)</li>
            <li>• Inclua informações sobre produtos/serviços</li>
            <li>• Defina limites do que o agente pode ou não fazer</li>
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
};
