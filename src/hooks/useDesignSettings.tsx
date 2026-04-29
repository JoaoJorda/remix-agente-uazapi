import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DesignSettings {
  id?: string;
  logoUrl: string | null;
  primaryColor: string;
  sidebarBgColor: string;
  sidebarPrimaryColor: string;
  accentColor: string;
  companyDisplayName: string | null;
  companySubtitle: string | null;
  bodyFont: string;
  headingFont: string;
  sidebarIdentityFont: string;
  sidebarIdentityEnabled: boolean;
}

const DEFAULT_SETTINGS: DesignSettings = {
  logoUrl: null,
  primaryColor: '220 9% 46%',
  sidebarBgColor: '220 13% 18%',
  sidebarPrimaryColor: '220 9% 46%',
  accentColor: '220 14% 96%',
  companyDisplayName: null,
  companySubtitle: null,
  bodyFont: 'Inter',
  headingFont: 'Inter',
  sidebarIdentityFont: 'Inter',
  sidebarIdentityEnabled: true,
};

interface DesignSettingsContextType extends DesignSettings {
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const DesignSettingsContext = createContext<DesignSettingsContextType>({
  ...DEFAULT_SETTINGS,
  isLoading: true,
  refetch: async () => {},
});

function loadGoogleFont(fontName: string) {
  if (fontName === 'Inter') return; // Inter is already loaded
  const id = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function applySettings(settings: DesignSettings) {
  const root = document.documentElement.style;
  root.setProperty('--primary', settings.primaryColor);
  root.setProperty('--ring', settings.primaryColor);
  root.setProperty('--sidebar-background', settings.sidebarBgColor);
  root.setProperty('--sidebar-primary', settings.sidebarPrimaryColor);
  root.setProperty('--sidebar-ring', settings.sidebarPrimaryColor);
  root.setProperty('--accent', settings.accentColor);
  root.setProperty('--secondary', settings.accentColor);
  root.setProperty('--muted', settings.accentColor);

  // Fonts
  loadGoogleFont(settings.bodyFont);
  loadGoogleFont(settings.headingFont);
  root.setProperty('--font-body', `'${settings.bodyFont}'`);
  root.setProperty('--font-heading', `'${settings.headingFont}'`);
}

export const DesignSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('design_settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching design settings:', error);
        return;
      }

      if (data) {
        const mapped: DesignSettings = {
          id: data.id,
          logoUrl: data.logo_url,
          primaryColor: data.primary_color || DEFAULT_SETTINGS.primaryColor,
          sidebarBgColor: data.sidebar_bg_color || DEFAULT_SETTINGS.sidebarBgColor,
          sidebarPrimaryColor: data.sidebar_primary_color || DEFAULT_SETTINGS.sidebarPrimaryColor,
          accentColor: data.accent_color || DEFAULT_SETTINGS.accentColor,
          companyDisplayName: data.company_display_name,
          companySubtitle: data.company_subtitle,
          bodyFont: (data as any).body_font || DEFAULT_SETTINGS.bodyFont,
          headingFont: (data as any).heading_font || DEFAULT_SETTINGS.headingFont,
          sidebarIdentityFont: (data as any).sidebar_identity_font || DEFAULT_SETTINGS.sidebarIdentityFont,
          sidebarIdentityEnabled: (data as any).sidebar_identity_enabled ?? DEFAULT_SETTINGS.sidebarIdentityEnabled,
        };
        setSettings(mapped);
        applySettings(mapped);
      }
    } catch (err) {
      console.error('Error in fetchSettings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    applySettings(DEFAULT_SETTINGS);
    fetchSettings();
  }, [fetchSettings]);

  return (
    <DesignSettingsContext.Provider value={{ ...settings, isLoading, refetch: fetchSettings }}>
      {children}
    </DesignSettingsContext.Provider>
  );
};

export const useDesignSettings = () => useContext(DesignSettingsContext);
