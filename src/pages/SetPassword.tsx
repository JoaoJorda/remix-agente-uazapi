import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useDesignSettings } from '@/hooks/useDesignSettings';

const SetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const { logoUrl, companyDisplayName } = useDesignSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (password.length < 8) {
      newErrors.password = 'A senha deve ter pelo menos 8 caracteres';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setIsSubmitting(true);
    try {
      // 1. Atualizar a senha no auth
      const { error: pwError } = await supabase.auth.updateUser({ password });

      if (pwError) {
        toast.error('Erro ao definir senha: ' + pwError.message);
        return;
      }

      // 2. Marcar no banco que a senha foi definida
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
      }

      toast.success('Senha definida com sucesso! Bem-vindo(a)!');
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-sidebar-primary/10 rounded-full blur-[128px] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-sidebar-primary/10 rounded-full blur-[128px] pointer-events-none translate-x-1/2 translate-y-1/2 z-0" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt={companyDisplayName || 'Logo'} className="max-h-36 object-contain" />
            </div>
          ) : companyDisplayName ? (
            <div className="flex justify-center mb-4">
              <h2 className="text-3xl font-bold text-sidebar-foreground">{companyDisplayName}</h2>
            </div>
          ) : null}

          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-sidebar-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-sidebar-foreground">
            Defina sua senha
          </h1>
          <p className="text-sidebar-foreground/70 mt-2">
            Crie uma senha segura para acessar a plataforma
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm hover:border-primary/30 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Salvar senha e entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-sidebar-foreground/50 text-xs mt-6">
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
};

export default SetPassword;
