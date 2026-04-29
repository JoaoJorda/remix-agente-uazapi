import React, { useEffect, useState } from 'react';
import { UserPlus, Search, Loader2, X, Check, Edit2, Users, Settings, Trash2, Calendar, Copy, Link, CheckCheck } from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import { TeamMember, type Team as TeamType, type TeamFunction } from '../types';
import { supabase } from '@/integrations/supabase/client';
import TeamConfigModal from './TeamConfigModal';
import { toast } from 'sonner';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

const Team: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [functions, setFunctions] = useState<TeamFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inviteLinkModal, setInviteLinkModal] = useState<{ open: boolean; link: string | null; email: string }>({ open: false, link: null, email: '' });
  const [linkCopied, setLinkCopied] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    role: 'agent',
    team_id: '',
    function_id: '',
    weight: 1
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [registrationSettingsId, setRegistrationSettingsId] = useState<string | null>(null);
  const [updatingRegistration, setUpdatingRegistration] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent',
    status: 'invited' as 'active' | 'invited' | 'disabled',
    team_id: '',
    function_id: '',
    weight: 1,
    receives_meetings: false
  });

  useEffect(() => {
    loadAllData();
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [membersData, teamsData, functionsData] = await Promise.all([
        api.fetchTeam(),
        api.fetchTeams(),
        api.fetchTeamFunctions()
      ]);
      setMembers(membersData);
      setTeams(teamsData as TeamType[]);
      setFunctions(functionsData as TeamFunction[]);
      
      // Load registration settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('id, registration_enabled')
        .limit(1)
        .single();
      if (settingsData) {
        setRegistrationSettingsId(settingsData.id);
        setRegistrationEnabled(settingsData.registration_enabled);
      }
    } catch (error) {
      console.error("Erro ao carregar dados da equipe", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('team-members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          team_id: formData.team_id || undefined,
          function_id: formData.function_id || undefined,
          weight: formData.weight,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', role: 'agent', team_id: '', function_id: '', weight: 1 });
      await loadAllData();

      // Abrir modal com o link gerado
      setInviteLinkModal({ open: true, link: data?.invite_link ?? null, email: formData.email });
    } catch (error: any) {
      console.error('Erro ao convidar membro:', error);
      toast.error(error?.message || 'Erro ao gerar convite. Verifique se o email já não está cadastrado.');
    }
  };

  const handleCopyLink = () => {
    if (!inviteLinkModal.link) return;
    navigator.clipboard.writeText(inviteLinkModal.link);
    setLinkCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleRegenerateLink = async (email: string) => {
    try {
      toast.loading('Gerando novo link...', { id: 'regen-link' });
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: { name: email.split('@')[0], email, regenerate: true },
      });
      toast.dismiss('regen-link');
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setLinkCopied(false);
      setInviteLinkModal({ open: true, link: data?.invite_link ?? null, email });
      toast.success('Novo link gerado!');
    } catch (err: any) {
      toast.dismiss('regen-link');
      toast.error(err?.message || 'Erro ao regenerar link');
    }
  };

  const handleUpdateMember = async (id: string, field: string, value: any) => {
    try {
      await api.updateTeamMember(id, { [field]: value });
      toast.success('Membro atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast.error('Erro ao atualizar membro');
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir ${name}?`)) return;
    try {
      await api.deleteTeamMember(id);
      toast.success('Membro removido com sucesso');
      await loadAllData();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      status: member.status,
      team_id: member.team_id || '',
      function_id: member.function_id || '',
      weight: member.weight || 1,
      receives_meetings: member.receives_meetings || false
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      await api.updateTeamMember(editingMember.id, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || null,
        role: editFormData.role as 'admin' | 'manager' | 'agent',
        status: editFormData.status,
        team_id: editFormData.team_id || null,
        function_id: editFormData.function_id || null,
        weight: editFormData.weight,
        receives_meetings: editFormData.receives_meetings
      });
      toast.success('Membro atualizado com sucesso!');
      setShowEditModal(false);
      setEditingMember(null);
      await loadAllData();
    } catch (error) {
      console.error('Erro ao editar membro:', error);
      toast.error('Erro ao editar membro');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'active':
            return <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/30 text-primary shadow-sm">Ativo</span>;
        case 'invited':
            return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 shadow-sm">Pendente</span>;
        default:
            return <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted border border-border text-muted-foreground shadow-sm">Inativo</span>;
    }
  };

  // Get the "Closer" function ID to check if a member is a closer
  const closerFunction = functions.find(f => f.name.toLowerCase() === 'closer');
  const closerFunctionId = closerFunction?.id;

  // Filtered members based on search
  const filteredMembers = members.filter(m => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const teamName = teams.find(t => t.id === m.team_id)?.name || '';
    const funcName = functions.find(f => f.id === m.function_id)?.name || '';
    return (
      m.name.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      teamName.toLowerCase().includes(term) ||
      funcName.toLowerCase().includes(term)
    );
  });

  // Dynamic stats
  const stats = {
    total: members.length,
    admins: members.filter(m => m.role === 'admin').length,
    members: members.filter(m => m.role !== 'admin').length,
    teams: teams.length
  };

  const handleRegistrationToggle = async (checked: boolean) => {
    setUpdatingRegistration(true);
    let error;
    if (registrationSettingsId) {
      const result = await supabase
        .from('system_settings')
        .update({ registration_enabled: checked })
        .eq('id', registrationSettingsId);
      error = result.error;
    } else {
      const result = await supabase
        .from('system_settings')
        .insert({ registration_enabled: checked })
        .select('id')
        .single();
      error = result.error;
      if (!error && result.data) {
        setRegistrationSettingsId(result.data.id);
      }
    }
    if (error) {
      toast.error('Erro ao atualizar configuração');
    } else {
      setRegistrationEnabled(checked);
      toast.success(checked ? 'Registro habilitado' : 'Registro desabilitado');
    }
    setUpdatingRegistration(false);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-foreground relative custom-scrollbar">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Equipe</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e times da organização</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowConfigModal(true)} variant="outline" className="border-border">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          <Button onClick={() => setShowModal(true)} className="shadow-lg shadow-primary/20">
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-2">Total de Usuários</div>
            <div className="text-3xl font-bold text-foreground">{loading ? '-' : stats.total}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-2">Admins</div>
            <div className="text-3xl font-bold text-foreground">{loading ? '-' : stats.admins}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-2">Membros</div>
            <div className="text-3xl font-bold text-foreground">{loading ? '-' : stats.members}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-2">Times Ativos</div>
            <div className="text-3xl font-bold text-foreground">{stats.teams}</div>
        </div>
      </div>

      {/* Registration Toggle */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-foreground font-medium">Permitir novos registros</Label>
          <p className="text-sm text-muted-foreground">
            Quando desativado, a opção de criar conta não aparecerá na tela de login.
          </p>
        </div>
        <Switch
          checked={registrationEnabled}
          onCheckedChange={handleRegistrationToggle}
          disabled={updatingRegistration}
        />
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
            type="text" 
            placeholder="Buscar por nome, email, time ou função..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-96 pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-ring outline-none placeholder:text-muted-foreground transition-all"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Usuários da Equipe</h3>
            <p className="text-sm text-muted-foreground mt-1">Gerencie roles e times dos usuários</p>
        </div>

        {loading ? (
             <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <span className="text-sm text-muted-foreground">Carregando dados...</span>
           </div>
        ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum membro cadastrado ainda.</p>
                <Button onClick={() => setShowModal(true)} variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Convidar Primeiro Membro
                </Button>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Função</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Peso</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Reuniões</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-muted/50 transition-colors group">
                                {/* User Info */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground border border-border uppercase">
                                            {member.name.substring(0, 2)}
                                        </div>
                                        <span className="text-sm font-medium text-foreground">{member.name}</span>
                                    </div>
                                </td>
                                
                                {/* Email */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-muted-foreground">{member.email}</span>
                                </td>

                                {/* Role Selector */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleUpdateMember(member.id, 'role', e.target.value)}
                                        className="w-32 px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground cursor-pointer hover:border-primary/50 transition-colors"
                                    >
                                        <option value="agent">Atendente</option>
                                        <option value="manager">Gerente</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>

                                {/* Time Selector */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={member.team_id || ''}
                                        onChange={(e) => handleUpdateMember(member.id, 'team_id', e.target.value || null)}
                                        className="w-32 px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground cursor-pointer hover:border-primary/50 transition-colors"
                                    >
                                        <option value="">Sem time</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* Function Selector */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={member.function_id || ''}
                                        onChange={(e) => handleUpdateMember(member.id, 'function_id', e.target.value || null)}
                                        className="w-32 px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground cursor-pointer hover:border-primary/50 transition-colors"
                                    >
                                        <option value="">Sem função</option>
                                        {functions.map(func => (
                                            <option key={func.id} value={func.id}>{func.name}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* Weight */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={member.weight || 1}
                                        onChange={(e) => handleUpdateMember(member.id, 'weight', parseInt(e.target.value))}
                                        className="w-16 px-2 py-1 bg-background border border-border rounded-md text-sm text-foreground text-center"
                                    />
                                </td>

                                {/* Receives Meetings Toggle - only for Closers */}
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {member.function_id === closerFunctionId ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Switch
                                                checked={member.receives_meetings || false}
                                                onCheckedChange={(checked) => handleUpdateMember(member.id, 'receives_meetings', checked)}
                                            />
                                            {member.receives_meetings && (
                                                <Calendar className="w-4 h-4 text-primary" />
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                    )}
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {getStatusBadge(member.status)}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        {member.status === 'invited' && (
                                            <button 
                                                onClick={() => handleRegenerateLink(member.email)}
                                                className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                                title="Reenviar / copiar link de convite"
                                            >
                                                <Link className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleEditClick(member)}
                                            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                            title="Editar membro"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteMember(member.id, member.name)}
                                            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            title="Excluir membro"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-foreground">Convidar para a Equipe</h3>
                    <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleInvite} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nome Completo</label>
                        <input 
                            required
                            type="text" 
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-ring outline-none transition-all"
                            placeholder="Ex: João da Silva"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email Corporativo</label>
                        <input 
                            required
                            type="email" 
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-ring outline-none transition-all"
                            placeholder="colaborador@empresa.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Telefone (opcional)</label>
                        <input 
                            type="tel" 
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-ring outline-none transition-all"
                            placeholder="+55 11 99999-9999"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nível de Acesso</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['agent', 'manager', 'admin'].map((role) => (
                                <div 
                                    key={role}
                                    onClick={() => setFormData({...formData, role})}
                                    className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${
                                        formData.role === role 
                                        ? 'bg-primary/10 border-primary text-foreground' 
                                        : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                                    }`}
                                >
                                    <div className="text-xs font-bold uppercase mb-1">{role === 'agent' ? 'Atendente' : role === 'manager' ? 'Gerente' : 'Admin'}</div>
                                    {formData.role === role && <div className="flex justify-center"><Check className="w-3 h-3" /></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Time (opcional)</label>
                        <select
                            value={formData.team_id}
                            onChange={(e) => setFormData({...formData, team_id: e.target.value})}
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground"
                        >
                            <option value="">Sem time</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Função (opcional)</label>
                        <select
                            value={formData.function_id}
                            onChange={(e) => setFormData({...formData, function_id: e.target.value})}
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground"
                        >
                            <option value="">Sem função</option>
                            {functions.map(func => (
                                <option key={func.id} value={func.id}>{func.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Peso (para distribuição)</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.weight}
                            onChange={(e) => setFormData({...formData, weight: parseInt(e.target.value)})}
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
                        <Button type="submit" className="flex-1">Enviar Convite</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Magic Link Modal */}
      {inviteLinkModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Convite Gerado!</h3>
                  <p className="text-xs text-muted-foreground">Compartilhe o link com o usuário</p>
                </div>
              </div>
              <button onClick={() => setInviteLinkModal({ open: false, link: null, email: '' })} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Um convite foi criado para <span className="font-semibold text-foreground">{inviteLinkModal.email}</span>. 
                Copie o link abaixo e envie diretamente ao usuário para que ele possa acessar a plataforma.
              </p>

              {inviteLinkModal.link ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground font-mono flex-1 truncate select-all">
                      {inviteLinkModal.link}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
                      linkCopied
                        ? 'bg-primary/10 border border-primary text-primary'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {linkCopied ? (
                      <>
                        <CheckCheck className="w-4 h-4" />
                        Link Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Link de Convite
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-600">
                    Não foi possível gerar o link de acesso direto. O membro foi cadastrado e receberá um email de convite.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleRegenerateLink(inviteLinkModal.email)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary text-sm font-medium transition-all"
                >
                  <Link className="w-4 h-4" />
                  Regenerar Link
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                O membro foi adicionado à equipe com status <span className="font-semibold">Pendente</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      <TeamConfigModal
        isOpen={showConfigModal} 
        onClose={() => setShowConfigModal(false)} 
        onUpdate={loadAllData}
      />

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="text-lg font-bold text-foreground">Editar Membro</h3>
                    <button onClick={() => { setShowEditModal(false); setEditingMember(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nome Completo</label>
                        <input 
                            required
                            type="text" 
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-ring outline-none transition-all"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <input 
                            required
                            type="email" 
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-ring outline-none transition-all"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Telefone</label>
                        <input 
                            type="tel" 
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-ring outline-none transition-all"
                            placeholder="+55 11 99999-9999"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nível de Acesso</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['agent', 'manager', 'admin'].map((role) => (
                                <div 
                                    key={role}
                                    onClick={() => setEditFormData({...editFormData, role})}
                                    className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${
                                        editFormData.role === role 
                                        ? 'bg-primary/10 border-primary text-foreground' 
                                        : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                                    }`}
                                >
                                    <div className="text-xs font-bold uppercase mb-1">{role === 'agent' ? 'Atendente' : role === 'manager' ? 'Gerente' : 'Admin'}</div>
                                    {editFormData.role === role && <div className="flex justify-center"><Check className="w-3 h-3" /></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Status</label>
                        <select
                            value={editFormData.status}
                            onChange={(e) => setEditFormData({...editFormData, status: e.target.value as 'active' | 'invited' | 'disabled'})}
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground"
                        >
                            <option value="active">Ativo</option>
                            <option value="invited">Pendente</option>
                            <option value="disabled">Inativo</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Time</label>
                        <select
                            value={editFormData.team_id}
                            onChange={(e) => setEditFormData({...editFormData, team_id: e.target.value})}
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground"
                        >
                            <option value="">Sem time</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Função</label>
                        <select
                            value={editFormData.function_id}
                            onChange={(e) => setEditFormData({...editFormData, function_id: e.target.value})}
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground"
                        >
                            <option value="">Sem função</option>
                            {functions.map(func => (
                                <option key={func.id} value={func.id}>{func.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Peso</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={editFormData.weight}
                            onChange={(e) => setEditFormData({...editFormData, weight: parseInt(e.target.value)})}
                            className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground"
                        />
                    </div>

                    {/* Receives Meetings Toggle - only show for Closers */}
                    {editFormData.function_id === closerFunctionId && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <div>
                                <label className="text-sm font-medium text-foreground">Recebe Reuniões</label>
                                <p className="text-xs text-muted-foreground">Participa do round-robin de agendamentos</p>
                            </div>
                        </div>
                        <Switch
                            checked={editFormData.receives_meetings}
                            onCheckedChange={(checked) => setEditFormData({...editFormData, receives_meetings: checked})}
                        />
                    </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingMember(null); }} className="flex-1">Cancelar</Button>
                        <Button type="submit" className="flex-1">Salvar Alterações</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Team;