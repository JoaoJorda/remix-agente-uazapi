import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import { Team, TeamFunction } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface TeamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = 'teams' | 'functions';

const TeamConfigModal: React.FC<TeamConfigModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [functions, setFunctions] = useState<TeamFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '#7AC143' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setupRealtime();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsData, functionsData] = await Promise.all([
        api.fetchTeams(),
        api.fetchTeamFunctions()
      ]);
      setTeams(teamsData as Team[]);
      setFunctions(functionsData as TeamFunction[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const teamsChannel = supabase
      .channel('teams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadData();
      })
      .subscribe();

    const functionsChannel = supabase
      .channel('functions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_functions' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(functionsChannel);
    };
  };

  const handleCreateTeam = async () => {
    if (!editForm.name.trim()) return;
    try {
      await api.createTeam({
        name: editForm.name,
        description: editForm.description,
        color: editForm.color
      });
      setEditForm({ name: '', description: '', color: '#7AC143' });
      setIsCreating(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleCreateFunction = async () => {
    if (!editForm.name.trim()) return;
    try {
      await api.createTeamFunction({
        name: editForm.name,
        description: editForm.description
      });
      setEditForm({ name: '', description: '', color: '#7AC143' });
      setIsCreating(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating function:', error);
    }
  };

  const handleUpdateTeam = async (id: string) => {
    try {
      await api.updateTeam(id, {
        name: editForm.name,
        description: editForm.description,
        color: editForm.color
      });
      setEditingId(null);
      setEditForm({ name: '', description: '', color: '#7AC143' });
      onUpdate();
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handleUpdateFunction = async (id: string) => {
    try {
      await api.updateTeamFunction(id, {
        name: editForm.name,
        description: editForm.description
      });
      setEditingId(null);
      setEditForm({ name: '', description: '', color: '#7AC143' });
      onUpdate();
    } catch (error) {
      console.error('Error updating function:', error);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este time?')) return;
    try {
      await api.deleteTeam(id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const handleDeleteFunction = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta função?')) return;
    try {
      await api.deleteTeamFunction(id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting function:', error);
    }
  };

  const startEdit = (item: Team | TeamFunction, type: 'team' | 'function') => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description || '',
      color: type === 'team' ? (item as Team).color : '#7AC143'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold text-foreground">⚙️ Configurar Equipe</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'teams'
                ? 'text-foreground border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🏢 Times
          </button>
          <button
            onClick={() => setActiveTab('functions')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'functions'
                ? 'text-foreground border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            💼 Funções
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh] custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activeTab === 'teams' ? (
            <div className="space-y-3">
              {/* Create New Team */}
              {isCreating ? (
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Nome do time"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-12 h-8 rounded cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground">Cor do time</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateTeam} className="flex-1">Salvar</Button>
                    <Button onClick={() => setIsCreating(false)} variant="ghost">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-muted/30 border border-dashed border-border rounded-lg p-4 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Time
                </button>
              )}

              {/* Teams List */}
              {teams.map((team) => (
                <div key={team.id} className="bg-muted/30 border border-border rounded-lg p-4">
                  {editingId === team.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editForm.color}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          className="w-12 h-8 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateTeam(team.id)} size="sm">
                          <Save className="w-3 h-3 mr-1" />
                          Salvar
                        </Button>
                        <Button onClick={() => setEditingId(null)} variant="ghost" size="sm">Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{team.name}</div>
                          {team.description && (
                            <div className="text-xs text-muted-foreground">{team.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(team, 'team')}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Create New Function */}
              {isCreating ? (
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Nome da função"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreateFunction} className="flex-1">Salvar</Button>
                    <Button onClick={() => setIsCreating(false)} variant="ghost">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-muted/30 border border-dashed border-border rounded-lg p-4 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova Função
                </button>
              )}

              {/* Functions List */}
              {functions.map((func) => (
                <div key={func.id} className="bg-muted/30 border border-border rounded-lg p-4">
                  {editingId === func.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateFunction(func.id)} size="sm">
                          <Save className="w-3 h-3 mr-1" />
                          Salvar
                        </Button>
                        <Button onClick={() => setEditingId(null)} variant="ghost" size="sm">Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">{func.name}</div>
                        {func.description && (
                          <div className="text-xs text-muted-foreground">{func.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(func, 'function')}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFunction(func.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <Button onClick={onClose} variant="ghost">Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default TeamConfigModal;
