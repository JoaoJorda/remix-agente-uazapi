import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CompanySettings {
  companyName: string;
  sdrName: string;
  loading: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

const CompanySettingsContext = createContext<CompanySettings | undefined>(undefined);

export const CompanySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyName, setCompanyName] = useState('');
  const [sdrName, setSdrName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

  const fetchSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsAdmin(roleData?.role === 'admin');
      
      // Fetch global nina_settings (no user_id filter)
      const { data, error } = await supabase
        .from('nina_settings')
        .select('company_name, sdr_name')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[useCompanySettings] Query error:', error);
        throw error;
      }

      if (data) {
        setCompanyName(data.company_name || 'Sua Empresa');
        setSdrName(data.sdr_name || 'Agente');
      } else {
        // No settings exist - use defaults (admin will need to configure via wizard)
        setCompanyName('Sua Empresa');
        setSdrName('Agente');
      }
    } catch (error) {
      console.error('[useCompanySettings] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const value: CompanySettings = {
    companyName,
    sdrName,
    loading,
    isAdmin,
    refetch: fetchSettings,
  };

  return (
    <CompanySettingsContext.Provider value={value}>
      {children}
    </CompanySettingsContext.Provider>
  );
};

export const useCompanySettings = () => {
  const context = useContext(CompanySettingsContext);
  if (context === undefined) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
};
