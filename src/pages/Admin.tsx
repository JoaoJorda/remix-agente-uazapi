import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';

const Admin: React.FC = () => {
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('id, registration_enabled')
        .limit(1)
        .single();
      if (data) {
        setSettingsId(data.id);
        setRegistrationEnabled(data.registration_enabled);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setUpdating(true);
    let error;

    if (settingsId) {
      const result = await supabase
        .from('system_settings')
        .update({ registration_enabled: checked })
        .eq('id', settingsId);
      error = result.error;
    } else {
      const result = await supabase
        .from('system_settings')
        .insert({ registration_enabled: checked })
        .select('id')
        .single();
      error = result.error;
      if (!error && result.data) {
        setSettingsId(result.data.id);
      }
    }

    if (error) {
      toast.error('Erro ao atualizar configuração');
    } else {
      setRegistrationEnabled(checked);
      toast.success(checked ? 'Registro habilitado' : 'Registro desabilitado');
    }
    setUpdating(false);
  };


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Configurações do Sistema</h2>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-foreground font-medium">Permitir novos registros</Label>
              <p className="text-sm text-muted-foreground">
                Quando desativado, a opção de criar conta não aparecerá na tela de login.
              </p>
            </div>
            <Switch
              checked={registrationEnabled}
              onCheckedChange={handleToggle}
              disabled={updating}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
