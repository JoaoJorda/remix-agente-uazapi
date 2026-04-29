import React, { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Send, Loader2, AlertTriangle, Upload, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import CsvUploader from './CsvUploader';
import ColumnMapper from './ColumnMapper';
import MessageEditor from './MessageEditor';
import PlatformContactsSelector from './PlatformContactsSelector';
import { useWhatsAppInstances } from '@/hooks/whatsapp/useWhatsAppInstances';
import { useBroadcasts, CreateCampaignInput, BroadcastCampaign } from '@/hooks/useBroadcasts';
import { normalizeBrazilianPhone } from '@/lib/phoneUtils';

interface CampaignWizardProps {
  onClose: () => void;
  onCampaignCreated: (campaign: BroadcastCampaign) => void;
}

type ContactSource = 'csv' | 'platform';

const STEPS = ['Contatos', 'Mapear Colunas', 'Mensagem', 'Configurar e Enviar'];

const CampaignWizard: React.FC<CampaignWizardProps> = ({ onClose, onCampaignCreated }) => {
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState('');

  // Source selection
  const [contactSource, setContactSource] = useState<ContactSource | null>(null);

  // CSV / contacts state
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  // Mapping state
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<string[]>([]);

  // Message state
  const [template, setTemplate] = useState('');

  // Config state
  const [instanceId, setInstanceId] = useState('');
  const [delayMin, setDelayMin] = useState(5);
  const [delayMax, setDelayMax] = useState(15);
  const [batchSize, setBatchSize] = useState(10);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(5);

  const { instances } = useWhatsAppInstances();
  const { createCampaign, startCampaign } = useBroadcasts();

  const connectedInstances = instances.filter(i => i.status === 'connected');

  const handleCsvParsed = useCallback((h: string[], r: string[][]) => {
    setHeaders(h);
    setRows(r);
  }, []);

  const handlePlatformContacts = useCallback((h: string[], r: string[][]) => {
    setHeaders(h);
    setRows(r);
    if (h.includes('phone')) {
      setMapping({ phone: 'phone', ...(h.includes('name') ? { name: 'name' } : {}) });
      setCustomFields(h.includes('name') ? ['name'] : []);
    }
  }, []);

  const handleMappingChange = useCallback((m: Record<string, string>, cf: string[]) => {
    setMapping(m);
    setCustomFields(cf);
  }, []);

  const getPreviewData = (): Record<string, any> | null => {
    if (rows.length === 0 || headers.length === 0) return null;
    const firstRow = rows[0];
    const preview: Record<string, any> = {};
    for (const [field, column] of Object.entries(mapping)) {
      if (field === 'phone') continue;
      const colIndex = headers.indexOf(column);
      if (colIndex >= 0) {
        preview[field] = firstRow[colIndex];
      }
    }
    return preview;
  };

  const buildRecipients = () => {
    const phoneColIndex = headers.indexOf(mapping.phone || '');
    if (phoneColIndex < 0) return [];

    return rows.map(row => {
      const variables: Record<string, any> = {};
      for (const [field, column] of Object.entries(mapping)) {
        if (field === 'phone') continue;
        const colIndex = headers.indexOf(column);
        if (colIndex >= 0) {
          variables[field] = row[colIndex];
        }
      }
      const rawPhone = row[phoneColIndex] || '';
      const normalized = normalizeBrazilianPhone(rawPhone);
      return {
        phone_number: normalized || rawPhone.replace(/\D/g, ''),
        variables,
      };
    }).filter(r => r.phone_number.length >= 10);
  };

  const isPlatformSource = contactSource === 'platform';

  const canAdvance = () => {
    switch (step) {
      case 0: return contactSource !== null && headers.length > 0 && rows.length > 0;
      case 1: return !!mapping.phone;
      case 2: return template.trim().length > 0;
      case 3: return !!campaignName.trim();
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 0 && isPlatformSource) {
      setStep(2); // skip column mapping for platform contacts
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 2 && isPlatformSource) {
      setStep(0);
    } else if (step > 0) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  const handleSourceSelect = (source: ContactSource) => {
    setContactSource(source);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setCustomFields([]);
  };

  const handleSubmit = async () => {
    const recipients = buildRecipients();
    if (recipients.length === 0) return;

    const input: CreateCampaignInput = {
      name: campaignName,
      message_template: template,
      message_type: 'text',
      instance_id: instanceId || undefined,
      delay_min_ms: delayMin * 1000,
      delay_max_ms: delayMax * 1000,
      batch_size: batchSize,
      delay_between_batches: delayBetweenBatches * 60,
      column_mapping: mapping,
      custom_fields: customFields,
      recipients,
    };

    try {
      const campaign = await createCampaign.mutateAsync(input);
      if (instanceId) {
        await startCampaign.mutateAsync(campaign.id);
      }
      onCampaignCreated(campaign);
    } catch {
      // Error handled by mutation
    }
  };

  const isSubmitting = createCampaign.isPending || startCampaign.isPending;
  const recipients = step === 3 ? buildRecipients() : [];

  // Effective step label (for platform, step 2 is visually step 2 of 3)
  const visibleStepCount = isPlatformSource ? 3 : 4;
  const visibleStepIndex = isPlatformSource && step >= 2 ? step - 1 : step;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Nova Campanha</h2>
            <p className="text-xs text-muted-foreground">
              Passo {visibleStepIndex + 1} de {visibleStepCount}
            </p>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border/50">
        {STEPS
          .filter((_, i) => !(isPlatformSource && i === 1)) // hide mapping step for platform
          .map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors
                ${i === visibleStepIndex ? 'bg-primary text-primary-foreground' :
                  i < visibleStepIndex ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}
              `}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === visibleStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < (isPlatformSource ? 2 : 3) && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Step 0: Source selection + contacts */}
        {step === 0 && (
          <div className="space-y-5">
            {/* Source picker */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Fonte dos contatos</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSourceSelect('platform')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    contactSource === 'platform'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-secondary/30'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${contactSource === 'platform' ? 'bg-primary/10' : 'bg-secondary'}`}>
                    <Users className={`w-5 h-5 ${contactSource === 'platform' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${contactSource === 'platform' ? 'text-primary' : 'text-foreground'}`}>
                      Contatos da plataforma
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Contatos já registrados</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSourceSelect('csv')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    contactSource === 'csv'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-secondary/30'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${contactSource === 'csv' ? 'bg-primary/10' : 'bg-secondary'}`}>
                    <Upload className={`w-5 h-5 ${contactSource === 'csv' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${contactSource === 'csv' ? 'text-primary' : 'text-foreground'}`}>
                      Importar CSV
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Upload de arquivo externo</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Contacts content based on source */}
            {contactSource === 'csv' && (
              <CsvUploader onDataParsed={handleCsvParsed} />
            )}

            {contactSource === 'platform' && (
              <PlatformContactsSelector
                onContactsSelected={handlePlatformContacts}
                selectedInstanceId={instanceId || connectedInstances[0]?.id}
              />
            )}
          </div>
        )}

        {step === 1 && (
          <ColumnMapper
            headers={headers}
            rows={rows}
            mapping={mapping}
            customFields={customFields}
            onMappingChange={handleMappingChange}
            instances={connectedInstances}
            selectedInstanceId={instanceId}
            onRowsFiltered={(filteredRows) => setRows(filteredRows)}
          />
        )}

        {step === 2 && (
          <MessageEditor
            template={template}
            customFields={customFields}
            previewData={getPreviewData()}
            onTemplateChange={setTemplate}
          />
        )}

        {step === 3 && (
          <div className="space-y-6">
            {/* Campaign name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Nome da campanha <span className="text-destructive">*</span>
              </label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Promoção Janeiro 2026"
                className="bg-background"
              />
            </div>

            {/* Instance selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Instância WhatsApp <span className="text-destructive">*</span>
              </label>
              <Select value={instanceId} onValueChange={setInstanceId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a instância" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name} {inst.phone_number ? `(${inst.phone_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connectedInstances.length === 0 && (
                <p className="text-xs text-destructive">
                  Nenhuma instância conectada. Conecte uma instância nas configurações.
                </p>
              )}
            </div>

            {/* Delay entre mensagens */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-foreground">
                Delay entre mensagens
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Mínimo: {delayMin}s</span>
                  <span className="text-xs text-muted-foreground">Máximo: {delayMax}s</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8">Min</span>
                    <Slider
                      value={[delayMin]}
                      onValueChange={([v]) => {
                        setDelayMin(v);
                        if (v > delayMax) setDelayMax(v);
                      }}
                      min={1}
                      max={60}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8">Max</span>
                    <Slider
                      value={[delayMax]}
                      onValueChange={([v]) => {
                        setDelayMax(v);
                        if (v < delayMin) setDelayMin(v);
                      }}
                      min={1}
                      max={120}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                {delayMin < 3 && (
                  <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-xs text-destructive">
                      Delay abaixo de 3s aumenta o risco de bloqueio do WhatsApp
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Configuração de lotes */}
            <div className="space-y-4 p-4 bg-secondary/30 border border-border rounded-xl">
              <label className="text-sm font-semibold text-foreground">
                Configuração de lotes
              </label>
              <p className="text-xs text-muted-foreground -mt-2">
                Agrupe os envios em lotes com pausa entre eles para evitar bloqueios
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Mensagens por lote: <strong className="text-foreground">{batchSize}</strong></span>
                  </div>
                  <Slider
                    value={[batchSize]}
                    onValueChange={([v]) => setBatchSize(v)}
                    min={1}
                    max={50}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Pausa entre lotes: <strong className="text-foreground">{delayBetweenBatches} min</strong></span>
                  </div>
                  <Slider
                    value={[delayBetweenBatches]}
                    onValueChange={([v]) => setDelayBetweenBatches(v)}
                    min={1}
                    max={30}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 min</span>
                    <span>30 min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-secondary/50 border border-border rounded-xl space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Resumo do envio</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Destinatários:</span>
                <span className="text-foreground font-medium">{recipients.length}</span>
                <span className="text-muted-foreground">Tamanho do lote:</span>
                <span className="text-foreground font-medium">{batchSize} mensagens</span>
                <span className="text-muted-foreground">Delay entre msgs:</span>
                <span className="text-foreground font-medium">{delayMin}s – {delayMax}s</span>
                <span className="text-muted-foreground">Pausa entre lotes:</span>
                <span className="text-foreground font-medium">{delayBetweenBatches} min</span>
                <span className="text-muted-foreground">Total de lotes:</span>
                <span className="text-foreground font-medium">{Math.ceil(recipients.length / batchSize)}</span>
                <span className="text-muted-foreground">Tempo estimado:</span>
                <span className="text-foreground font-medium">
                  ~{(() => {
                    const batches = Math.ceil(recipients.length / batchSize);
                    const msgDelay = (delayMin + delayMax) / 2;
                    const totalMsgDelay = recipients.length * msgDelay;
                    const totalBatchPause = (batches - 1) * delayBetweenBatches * 60;
                    const totalSeconds = totalMsgDelay + totalBatchPause;
                    if (totalSeconds < 60) return '<1 min';
                    return totalSeconds >= 3600
                      ? `${(totalSeconds / 3600).toFixed(1)}h`
                      : `${Math.ceil(totalSeconds / 60)} min`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <button
          onClick={step === 0 ? onClose : handleBack}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance() || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Disparar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CampaignWizard;
