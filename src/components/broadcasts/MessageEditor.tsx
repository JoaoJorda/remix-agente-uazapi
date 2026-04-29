import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Variable, Eye } from 'lucide-react';

interface MessageEditorProps {
  template: string;
  customFields: string[];
  previewData: Record<string, any> | null;
  onTemplateChange: (template: string) => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({
  template,
  customFields,
  previewData,
  onTemplateChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (field: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = template;
    const variable = `{{${field}}}`;

    const newText = text.substring(0, start) + variable + text.substring(end);
    onTemplateChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const getPreviewText = () => {
    if (!previewData || !template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = previewData[key];
      return value !== undefined && value !== null ? String(value) : match;
    });
  };

  return (
    <div className="space-y-4">
      {/* Variable buttons */}
      {customFields.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Variable className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Variáveis disponíveis
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {customFields.map((field) => (
              <button
                key={field}
                onClick={() => insertVariable(field)}
                className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs font-mono text-primary hover:bg-primary/20 transition-colors"
              >
                {`{{${field}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template editor */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Mensagem</label>
        <Textarea
          ref={textareaRef}
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
          placeholder={`Olá {{nome}}, tudo bem?\n\nEscreva sua mensagem aqui usando variáveis entre {{ }}`}
          className="min-h-[160px] font-mono text-sm bg-background resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Use {'{{variavel}}'} para inserir dados personalizados de cada contato
        </p>
      </div>

      {/* Preview */}
      {template && previewData && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Preview (1º contato)
            </span>
          </div>
          <div className="p-4 bg-secondary/50 border border-border rounded-xl">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {getPreviewText()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageEditor;
