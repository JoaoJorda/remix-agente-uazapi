import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCheckingProfile(false);
      return;
    }

    const checkProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', user.id)
        .single();

      setMustChangePassword(data?.must_change_password ?? false);
      setCheckingProfile(false);
    };

    checkProfile();
  }, [user, loading]);

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/set-password" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
