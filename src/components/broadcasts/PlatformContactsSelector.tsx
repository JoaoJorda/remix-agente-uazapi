import React, { useState, useEffect } from 'react';
import { Search, Users, Check, X, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

interface PlatformContact {
  id: string;
  name: string | null;
  call_name: string | null;
  phone_number: string;
  whatsapp_id: string | null;
  instance_id: string | null;
  tags: string[] | null;
}

interface PlatformContactsSelectorProps {
  onContactsSelected: (headers: string[], rows: string[][]) => void;
  selectedInstanceId?: string;
}

const PlatformContactsSelector: React.FC<PlatformContactsSelectorProps> = ({
  onContactsSelected,
  selectedInstanceId,
}) => {
  const [contacts, setContacts] = useState<PlatformContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterByInstance, setFilterByInstance] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [filterByInstance, selectedInstanceId]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contacts')
        .select('id, name, call_name, phone_number, whatsapp_id, instance_id, tags')
        .eq('is_blocked', false)
        .not('phone_number', 'is', null)
        .order('name', { ascending: true });

      if (filterByInstance && selectedInstanceId) {
        query = query.eq('instance_id', selectedInstanceId);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      setContacts((data as PlatformContact[]) || []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.call_name?.toLowerCase().includes(q) ||
      c.phone_number.includes(q)
    );
  });

  const toggleContact = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  // Whenever selection changes, emit data in CSV-like format (headers + rows)
  useEffect(() => {
    const selected = contacts.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) {
      onContactsSelected([], []);
      return;
    }

    const headers = ['phone', 'name'];
    const rows = selected.map(c => [
      c.phone_number,
      c.call_name || c.name || '',
    ]);
    onContactsSelected(headers, rows);
  }, [selectedIds, contacts]);

  const displayName = (c: PlatformContact) =>
    c.call_name || c.name || c.phone_number;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-9 bg-background"
          />
        </div>
        {selectedInstanceId && (
          <button
            onClick={() => setFilterByInstance(!filterByInstance)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              filterByInstance
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary text-muted-foreground border-border'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Só desta instância
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {loading ? 'Carregando...' : `${filteredContacts.length} contatos encontrados`}
        </span>
        {filteredContacts.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {selectedIds.size === filteredContacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        )}
      </div>

      {/* Selection summary */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {selectedIds.size} contato{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded hover:bg-primary/20 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      )}

      {/* Contact list */}
      <div className="border border-border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            Carregando contatos...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Users className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
            {filterByInstance && selectedInstanceId && (
              <button
                onClick={() => setFilterByInstance(false)}
                className="text-xs text-primary hover:underline"
              >
                Ver todos os contatos
              </button>
            )}
          </div>
        ) : (
          filteredContacts.map((contact, i) => {
            const isSelected = selectedIds.has(contact.id);
            return (
              <button
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0 ${
                  isSelected
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'hover:bg-secondary/50'
                }`}
              >
                {/* Checkbox */}
                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-primary border-primary' : 'border-border'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                  {displayName(contact).charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName(contact)}
                  </p>
                  <p className="text-xs text-muted-foreground">{contact.phone_number}</p>
                </div>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex gap-1 flex-shrink-0">
                    {contact.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PlatformContactsSelector;
