import React, { useState, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { Upload, X, ImageIcon, Type } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export interface DesignSettingsRef {
  save: () => Promise<void>;
  cancel: () => void;
  isSaving: boolean;
}

interface ColorField {
  key: string;
  label: string;
  cssVar: string;
}

const COLOR_FIELDS: ColorField[] = [
  { key: 'primaryColor', label: 'Cor Primária', cssVar: '--primary' },
  { key: 'sidebarBgColor', label: 'Fundo do Sidebar', cssVar: '--sidebar-background' },
  { key: 'sidebarPrimaryColor', label: 'Cor Primária do Sidebar', cssVar: '--sidebar-primary' },
  { key: 'accentColor', label: 'Cor de Acento', cssVar: '--accent' },
];

const FONT_OPTIONS = [
  'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Montserrat',
  'Lato', 'Nunito', 'Raleway', 'Plus Jakarta Sans', 'DM Sans',
];

const IDENTITY_FONT_OPTIONS = [
  'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville',
  'Merriweather', 'Lora', 'EB Garamond',
  'Inter', 'Poppins', 'Montserrat', 'Raleway', 'DM Sans',
];

function hslStringToHex(hsl: string): string {
  const parts = hsl.match(/([\d.]+)/g);
  if (!parts || parts.length < 3) return '#b89a6a';
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHslString(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function loadGoogleFont(fontName: string) {
  if (fontName === 'Inter') return;
  const id = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

const DesignSettings = forwardRef<DesignSettingsRef>((_, ref) => {
  const design = useDesignSettings();
  const { isAdmin } = useCompanySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [colors, setColors] = useState({
    primaryColor: design.primaryColor,
    sidebarBgColor: design.sidebarBgColor,
    sidebarPrimaryColor: design.sidebarPrimaryColor,
    accentColor: design.accentColor,
  });
  const [companyDisplayName, setCompanyDisplayName] = useState(design.companyDisplayName || '');
  const [companySubtitle, setCompanySubtitle] = useState(design.companySubtitle || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(design.logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bodyFont, setBodyFont] = useState(design.bodyFont);
  const [headingFont, setHeadingFont] = useState(design.headingFont);
  const [sidebarIdentityFont, setSidebarIdentityFont] = useState(design.sidebarIdentityFont);
  const [sidebarIdentityEnabled, setSidebarIdentityEnabled] = useState(design.sidebarIdentityEnabled);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when context loads
  React.useEffect(() => {
    if (!design.isLoading) {
      setColors({
        primaryColor: design.primaryColor,
        sidebarBgColor: design.sidebarBgColor,
        sidebarPrimaryColor: design.sidebarPrimaryColor,
        accentColor: design.accentColor,
      });
      setCompanyDisplayName(design.companyDisplayName || '');
      setCompanySubtitle(design.companySubtitle || '');
      setLogoPreview(design.logoUrl);
      setBodyFont(design.bodyFont);
      setHeadingFont(design.headingFont);
      setSidebarIdentityFont(design.sidebarIdentityFont);
      setSidebarIdentityEnabled(design.sidebarIdentityEnabled);
    }
  }, [design.isLoading]);

  const handleColorChange = useCallback((key: string, hex: string) => {
    const hsl = hexToHslString(hex);
    setColors(prev => ({ ...prev, [key]: hsl }));
    const field = COLOR_FIELDS.find(f => f.key === key);
    if (field) {
      document.documentElement.style.setProperty(field.cssVar, hsl);
      if (key === 'primaryColor') {
        document.documentElement.style.setProperty('--ring', hsl);
      }
      if (key === 'sidebarPrimaryColor') {
        document.documentElement.style.setProperty('--sidebar-ring', hsl);
      }
      if (key === 'accentColor') {
        document.documentElement.style.setProperty('--secondary', hsl);
        document.documentElement.style.setProperty('--muted', hsl);
      }
    }
  }, []);

  const handleFontChange = useCallback((type: 'body' | 'heading', fontName: string) => {
    loadGoogleFont(fontName);
    if (type === 'body') {
      setBodyFont(fontName);
      document.documentElement.style.setProperty('--font-body', `'${fontName}'`);
    } else {
      setHeadingFont(fontName);
      document.documentElement.style.setProperty('--font-heading', `'${fontName}'`);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são aceitas');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const save = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      let logoUrl = design.logoUrl; // Use DB value, not preview

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      } else if (logoPreview === null) {
        logoUrl = null;
      }

      const payload = {
        logo_url: logoUrl,
        primary_color: colors.primaryColor,
        sidebar_bg_color: colors.sidebarBgColor,
        sidebar_primary_color: colors.sidebarPrimaryColor,
        accent_color: colors.accentColor,
        company_display_name: companyDisplayName || null,
        company_subtitle: companySubtitle || null,
        body_font: bodyFont,
        heading_font: headingFont,
        sidebar_identity_font: sidebarIdentityFont,
        sidebar_identity_enabled: sidebarIdentityEnabled,
      };

      const { data: existing } = await supabase
        .from('design_settings')
        .select('id')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('design_settings')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('design_settings')
          .insert(payload);
        if (error) throw error;
      }

      setLogoFile(null);
      await design.refetch();
      toast.success('Design System salvo com sucesso!');
    } catch (err: any) {
      console.error('Error saving design settings:', err);
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const cancel = () => {
    setColors({
      primaryColor: design.primaryColor,
      sidebarBgColor: design.sidebarBgColor,
      sidebarPrimaryColor: design.sidebarPrimaryColor,
      accentColor: design.accentColor,
    });
    setCompanyDisplayName(design.companyDisplayName || '');
    setCompanySubtitle(design.companySubtitle || '');
    setLogoPreview(design.logoUrl);
    setLogoFile(null);
    setBodyFont(design.bodyFont);
    setHeadingFont(design.headingFont);
    setSidebarIdentityFont(design.sidebarIdentityFont);
    setSidebarIdentityEnabled(design.sidebarIdentityEnabled);
    // Reapply original colors
    COLOR_FIELDS.forEach(field => {
      const val = (design as any)[field.key];
      document.documentElement.style.setProperty(field.cssVar, val);
    });
    document.documentElement.style.setProperty('--ring', design.primaryColor);
    document.documentElement.style.setProperty('--sidebar-ring', design.sidebarPrimaryColor);
    document.documentElement.style.setProperty('--secondary', design.accentColor);
    document.documentElement.style.setProperty('--muted', design.accentColor);
    // Reapply original fonts
    document.documentElement.style.setProperty('--font-body', `'${design.bodyFont}'`);
    document.documentElement.style.setProperty('--font-heading', `'${design.headingFont}'`);
  };

  useImperativeHandle(ref, () => ({ save, cancel, isSaving }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Logo Upload */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Logo</h3>
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden shrink-0"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => isAdmin && fileInputRef.current?.click()}
          >
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1.5" />
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); removeLogo(); }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-destructive/90 rounded-full text-destructive-foreground hover:bg-destructive transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{isAdmin ? 'Upload' : '—'}</span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            disabled={!isAdmin}
          />
          <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG — Máx 2MB</p>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cores</h3>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_FIELDS.map(field => {
            const hslVal = (colors as any)[field.key];
            const hexVal = hslStringToHex(hslVal);
            return (
              <div key={field.key} className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={hexVal}
                  onChange={e => handleColorChange(field.key, e.target.value)}
                  disabled={!isAdmin}
                  className="w-7 h-7 rounded border border-border cursor-pointer disabled:opacity-50 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] text-muted-foreground block truncate">{field.label}</Label>
                  <Input
                    value={hexVal}
                    onChange={e => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                        handleColorChange(field.key, v);
                      }
                    }}
                    placeholder="#000000"
                    disabled={!isAdmin}
                    className="font-mono text-[11px] uppercase h-7 px-1.5"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Typography */}
      <div className="bg-card border border-border rounded-lg p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" />
          Tipografia
        </h3>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Corpo</Label>
            <Select value={bodyFont} onValueChange={v => handleFontChange('body', v)} disabled={!isAdmin}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(font => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Títulos</Label>
            <Select value={headingFont} onValueChange={v => handleFontChange('heading', v)} disabled={!isAdmin}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(font => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identidade</h3>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="sidebar-identity-toggle" className="text-[10px] text-muted-foreground">
              Sidebar
            </Label>
            <Switch
              id="sidebar-identity-toggle"
              checked={sidebarIdentityEnabled}
              onCheckedChange={setSidebarIdentityEnabled}
              disabled={!isAdmin}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Nome</Label>
            <Input
              value={companyDisplayName}
              onChange={e => setCompanyDisplayName(e.target.value)}
              placeholder="Minha Empresa"
              disabled={!isAdmin}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Subtítulo</Label>
            <Input
              value={companySubtitle}
              onChange={e => setCompanySubtitle(e.target.value)}
              placeholder="Soluções Digitais"
              disabled={!isAdmin}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Fonte</Label>
            <Select
              value={sidebarIdentityFont}
              onValueChange={v => {
                loadGoogleFont(v);
                setSidebarIdentityFont(v);
              }}
              disabled={!isAdmin}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDENTITY_FONT_OPTIONS.map(font => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: `'${font}', serif` }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
});

DesignSettings.displayName = 'DesignSettings';

export default DesignSettings;
