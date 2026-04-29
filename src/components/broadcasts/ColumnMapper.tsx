import React, { useState } from 'react';
import { Plus, Trash2, Phone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import ContactValidator from './ContactValidator';
import WhatsAppNumberValidator from './WhatsAppNumberValidator';
import type { WhatsAppInstance } from '@/hooks/whatsapp/useWhatsAppInstances';

interface ColumnMapperProps {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  customFields: string[];
  onMappingChange: (mapping: Record<string, string>, customFields: string[]) => void;
  instances: WhatsAppInstance[];
  selectedInstanceId?: string;
  onRowsFiltered: (rows: string[][]) => void;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({
  headers,
  rows,
  mapping,
  customFields,
  onMappingChange,
  instances,
  selectedInstanceId,
  onRowsFiltered,
}) => {
  const [newFieldName, setNewFieldName] = useState('');

  const updateMapping = (field: string, column: string) => {
    const newMapping = { ...mapping, [field]: column };
    onMappingChange(newMapping, customFields);
  };

  const addCustomField = () => {
    const fieldName = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!fieldName || customFields.includes(fieldName)) return;

    const newFields = [...customFields, fieldName];
    onMappingChange(mapping, newFields);
    setNewFieldName('');
  };

  const removeCustomField = (field: string) => {
    const newFields = customFields.filter(f => f !== field);
    const newMapping = { ...mapping };
    delete newMapping[field];
    onMappingChange(newMapping, newFields);
  };

  return (
    <div className="space-y-6">
      {/* Phone mapping (required) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          <label className="text-sm font-semibold text-foreground">
            Telefone <span className="text-destructive">*</span>
          </label>
        </div>
        <Select
          value={mapping.phone || ''}
          onValueChange={(val) => updateMapping('phone', val)}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Selecione a coluna do telefone" />
          </SelectTrigger>
          <SelectContent>
            {headers.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Selecione a coluna que contém os números de telefone
        </p>
      </div>

      {/* Custom fields */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">
          Campos personalizados
        </label>
        <p className="text-xs text-muted-foreground">
          Crie variáveis para usar na mensagem (ex: nome, empresa). Aponte cada variável para uma coluna do CSV.
        </p>

        {customFields.map((field) => (
          <div key={field} className="flex items-center gap-2">
            <div className="min-w-[120px] px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm font-mono text-primary">
              {`{{${field}}}`}
            </div>
            <Select
              value={mapping[field] || ''}
              onValueChange={(val) => updateMapping(field, val)}
            >
              <SelectTrigger className="flex-1 bg-background">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => removeCustomField(field)}
              className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}

        {/* Add new field */}
        <div className="flex items-center gap-2">
          <Input
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Nome da variável (ex: nome)"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addCustomField()}
          />
          <button
            onClick={addCustomField}
            disabled={!newFieldName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* WhatsApp Number Validator */}
      <WhatsAppNumberValidator
        headers={headers}
        rows={rows}
        mapping={mapping}
        instances={instances}
        selectedInstanceId={selectedInstanceId}
        onRowsFiltered={onRowsFiltered}
      />

      {/* Contact name validator */}
      <ContactValidator
        headers={headers}
        rows={rows}
        mapping={mapping}
        customFields={customFields}
        instances={instances}
        selectedInstanceId={selectedInstanceId}
      />
    </div>
  );
};

export default ColumnMapper;
