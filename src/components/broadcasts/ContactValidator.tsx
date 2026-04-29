import React, { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WhatsAppInstance } from '@/hooks/whatsapp/useWhatsAppInstances';

interface ContactValidatorProps {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  customFields: string[];
  instances: WhatsAppInstance[];
  selectedInstanceId?: string;
}

interface ValidationResult {
  phone: string;
  csv_name: string;
  whatsapp_name: string | null;
  profile_picture: string | null;
  match: 'confirmed' | 'divergent' | 'not_found';
}

const ContactValidator: React.FC<ContactValidatorProps> = ({
  headers,
  rows,
  mapping,
  customFields,
  instances,
  selectedInstanceId,
}) => {
  const [instanceId, setInstanceId] = useState(selectedInstanceId || '');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Find a name field from customFields that is mapped
  const nameField = customFields.find(f =>
    ['nome', 'name', 'primeiro_nome', 'first_name', 'cliente', 'contato'].includes(f) && mapping[f]
  ) || customFields.find(f => mapping[f]);

  const phoneCol = mapping.phone;
  const nameCol = nameField ? mapping[nameField] : null;

  // Only show if phone AND at least one name field are mapped
  if (!phoneCol || !nameCol) return null;

  const connectedInstances = instances.filter(i => i.status === 'connected');
  const effectiveInstanceId = instanceId || selectedInstanceId || '';

  const handleValidate = async () => {
    if (!effectiveInstanceId) return;

    setIsValidating(true);
    setProgress(0);
    setResults([]);

    const phoneIndex = headers.indexOf(phoneCol);
    const nameIndex = headers.indexOf(nameCol!);

    const contacts = rows.slice(0, 100).map(row => ({
      phone: row[phoneIndex] || '',
      csv_name: row[nameIndex] || '',
    })).filter(c => c.phone.replace(/\D/g, '').length >= 10);

    try {
      // Simulate progress (since edge function processes all at once)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 300);

      const { data, error } = await supabase.functions.invoke('validate-contacts', {
        body: { instance_id: effectiveInstanceId, contacts },
      });

      clearInterval(progressInterval);

      if (error) throw error;
      setResults(data.results || []);
      setProgress(100);
    } catch (err: any) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const confirmed = results.filter(r => r.match === 'confirmed').length;
  const divergent = results.filter(r => r.match === 'divergent').length;
  const notFound = results.filter(r => r.match === 'not_found').length;

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Validar Nomes
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Verifica se os nomes do CSV correspondem aos perfis do WhatsApp (máx. 100 contatos)
          </p>
        </div>
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
            Validar Nomes ({Math.min(rows.length, 100)} contatos)
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
          {/* Summary counters */}
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">{confirmed} confirmados</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">{divergent} divergentes</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-700">{notFound} não encontrados</span>
            </div>
          </div>

          {/* Accuracy */}
          {results.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Taxa de acerto: <span className="font-semibold text-foreground">{Math.round((confirmed / results.length) * 100)}%</span>
            </p>
          )}

          {/* Results table */}
          <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Telefone</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Nome CSV</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Nome WhatsApp</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-2 text-foreground font-mono">{r.phone}</td>
                    <td className="p-2 text-foreground">{r.csv_name}</td>
                    <td className="p-2 text-foreground">{r.whatsapp_name || '—'}</td>
                    <td className="p-2">
                      {r.match === 'confirmed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 text-[10px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Confirmado
                        </span>
                      )}
                      {r.match === 'divergent' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700 text-[10px] font-medium">
                          <AlertTriangle className="w-3 h-3" /> Divergente
                        </span>
                      )}
                      {r.match === 'not_found' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 text-[10px] font-medium">
                          <XCircle className="w-3 h-3" /> Não encontrado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactValidator;
