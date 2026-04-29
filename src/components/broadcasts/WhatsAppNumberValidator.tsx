import React, { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WhatsAppInstance } from '@/hooks/whatsapp/useWhatsAppInstances';
import { normalizeBrazilianPhone } from '@/lib/phoneUtils';

interface WhatsAppNumberValidatorProps {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  instances: WhatsAppInstance[];
  selectedInstanceId?: string;
  onRowsFiltered: (rows: string[][]) => void;
}

interface NumberResult {
  phone: string;       // normalized (E.164)
  originalPhone: string;
  rowIndex: number;
  exists: boolean;
  jid: string | null;
}

const WhatsAppNumberValidator: React.FC<WhatsAppNumberValidatorProps> = ({
  headers,
  rows,
  mapping,
  instances,
  selectedInstanceId,
  onRowsFiltered,
}) => {
  const [instanceId, setInstanceId] = useState(selectedInstanceId || '');
  const [results, setResults] = useState<NumberResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showInvalid, setShowInvalid] = useState(false);
  const [filtered, setFiltered] = useState(false);

  const phoneCol = mapping.phone;
  const connectedInstances = instances.filter(i => i.status === 'connected');
  const effectiveInstanceId = instanceId || selectedInstanceId || '';

  const handleValidate = async () => {
    if (!effectiveInstanceId || !phoneCol) return;

    setIsValidating(true);
    setProgress(0);
    setResults([]);
    setFiltered(false);

    const phoneIndex = headers.indexOf(phoneCol);

    // Normalize each phone number using Brazilian phone normalization
    // (handles +55, missing 9th digit, separators, etc.)
    const numbersWithIndex = rows
      .map((row, rowIndex) => {
        const raw = row[phoneIndex] || '';
        const normalized = normalizeBrazilianPhone(raw);
        return { phone: normalized || '', originalPhone: raw, rowIndex, valid: !!normalized };
      })
      .filter(n => n.valid);

    const numbersToValidate = numbersWithIndex.map(n => n.phone);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 3, 90));
      }, 400);

      // Send already-normalized numbers — edge function also normalizes as fallback
      const { data, error } = await supabase.functions.invoke('validate-whatsapp-numbers', {
        body: { instance_id: effectiveInstanceId, numbers: numbersToValidate },
      });

      clearInterval(progressInterval);

      if (error) throw error;

      const apiResults: Array<{ phone: string; exists: boolean; jid: string | null }> =
        data.results || [];

      // Map API results back to row indices
      const mapped: NumberResult[] = apiResults.map((r, i) => ({
        phone: r.phone,
        originalPhone: numbersWithIndex[i]?.originalPhone || r.phone,
        rowIndex: numbersWithIndex[i]?.rowIndex ?? i,
        exists: r.exists,
        jid: r.jid,
      }));

      setResults(mapped);
      setProgress(100);
    } catch (err: any) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveInvalid = () => {
    const validRowIndices = new Set(
      results.filter(r => r.exists).map(r => r.rowIndex)
    );

    const validRows = rows.filter((_, idx) => {
      const wasValidated = results.some(r => r.rowIndex === idx);
      if (wasValidated) return validRowIndices.has(idx);
      return false; // rows with invalid phone format are also removed
    });

    onRowsFiltered(validRows);
    setFiltered(true);
  };

  const validCount = results.filter(r => r.exists).length;
  const invalidCount = results.filter(r => !r.exists).length;
  const invalidResults = results.filter(r => !r.exists);

  // Don't render if phone column isn't mapped
  if (!phoneCol) return null;

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Validar Números WhatsApp
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Verifica quais números possuem conta no WhatsApp. Normaliza automaticamente formatos como +55, dígito 9 e separadores.
        </p>
      </div>

      {/* Instance selector if none pre-selected */}
      {!selectedInstanceId && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Instância para validação</label>
          <Select value={instanceId} onValueChange={setInstanceId}>
            <SelectTrigger className="bg-background h-9">
              <SelectValue placeholder="Selecione a instância" />
            </SelectTrigger>
            <SelectContent>
              {connectedInstances.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name} {inst.phone_number ? `(${inst.phone_number})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {connectedInstances.length === 0 && !selectedInstanceId && (
        <p className="text-xs text-destructive">Nenhuma instância conectada para validação.</p>
      )}

      {/* Validate button */}
      <button
        onClick={handleValidate}
        disabled={isValidating || !effectiveInstanceId || connectedInstances.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isValidating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Validando... ({Math.round(progress)}%)
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            Validar {rows.length} números
          </>
        )}
      </button>

      {/* Progress bar */}
      {isValidating && (
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {/* Summary chips */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">{validCount} com WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">{invalidCount} sem WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg">
              <span className="text-xs font-medium text-muted-foreground">
                {results.length > 0 ? Math.round((validCount / results.length) * 100) : 0}% válidos
              </span>
            </div>
          </div>

          {/* Remove invalid button */}
          {invalidCount > 0 && !filtered && (
            <button
              onClick={handleRemoveInvalid}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remover {invalidCount} número{invalidCount > 1 ? 's' : ''} sem WhatsApp
            </button>
          )}

          {filtered && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Lista filtrada — {validCount} contato{validCount !== 1 ? 's' : ''} válido{validCount !== 1 ? 's' : ''} mantido{validCount !== 1 ? 's' : ''}.
              </span>
            </div>
          )}

          {/* Collapsible invalid list */}
          {invalidCount > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowInvalid(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-secondary/50 hover:bg-secondary/80 transition-colors text-xs font-medium text-muted-foreground"
              >
                <span>Ver números sem WhatsApp ({invalidCount})</span>
                {showInvalid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showInvalid && (
                <div className="max-h-[200px] overflow-y-auto">
                  {invalidResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-t border-border/50">
                      <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground">{r.originalPhone}</span>
                      <span className="text-xs text-muted-foreground/60 font-mono ml-auto">{r.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppNumberValidator;
