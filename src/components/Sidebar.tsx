import React, { useState } from 'react';
import { LayoutDashboard, MessageSquare, Users, Settings as SettingsIcon, LogOut, ShieldCheck, Calendar, Kanban, ShieldAlert } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'chat', label: 'Chat Ao Vivo', icon: MessageSquare },
  { id: 'contacts', label: 'Contatos', icon: Users },
  
  { id: 'scheduling', label: 'Agendamentos', icon: Calendar },
  { id: 'team', label: 'Equipe', icon: ShieldCheck },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon },
];

const Logo = () => {
  const { logoUrl, companyDisplayName, companySubtitle, sidebarIdentityFont, sidebarIdentityEnabled } = useDesignSettings();
  const displayName = companyDisplayName || '';
  const subtitle = companySubtitle || '';
  const logoSrc = logoUrl;

  return (
    <Link to="/dashboard" className="flex flex-col items-center py-2 gap-2">
      {logoSrc && (
        <img src={logoSrc} alt={displayName || 'Logo'} className="h-[60px] object-contain" />
      )}
      {sidebarIdentityEnabled && (displayName || subtitle) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-0.5"
          style={{ fontFamily: `'${sidebarIdentityFont}', serif` }}
        >
          {displayName && (
            <span className="text-sm font-semibold tracking-[0.25em] text-primary uppercase">{displayName}</span>
          )}
          {subtitle && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">{subtitle}</span>
          )}
        </motion.div>
      )}
      <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mt-1" />
    </Link>
  );
};

const LogoIcon = () => {
  const { logoUrl, companyDisplayName } = useDesignSettings();
  const logoSrc = logoUrl;

  return (
    <Link to="/dashboard" className="flex items-center justify-center py-2">
      {logoSrc ? (
        <img src={logoSrc} alt={companyDisplayName || 'Logo'} className="h-[32px] object-contain" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          {(companyDisplayName || '?').charAt(0)}
        </div>
      )}
    </Link>
  );
};

const SidebarContent = () => {
  const { companyName } = useCompanySettings();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.substring(1) || 'dashboard';
  const { open, setOpen } = useSidebar();

  const links = menuItems.map(item => ({
    label: item.label,
    href: `/${item.id}`,
    icon: <item.icon className="h-5 w-5" />,
  }));

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso');
      navigate('/auth', { replace: true });
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'US';
    const email = user.email;
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return 'Usuário';
  };

  return (
    <>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mb-8">
          {open ? <Logo /> : <LogoIcon />}
        </div>
        
        <nav className="flex flex-col gap-1">
          {links.map((link, idx) => (
            <SidebarLink
              key={idx}
              link={link}
              isActive={currentPath.startsWith(link.href.slice(1))}
            />
          ))}
        </nav>
      </div>

      {/* User Footer */}
      <div className="pt-4 relative">
        <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary ring-1 ring-primary/30 flex-shrink-0">
            {getUserInitials()}
          </div>
          <motion.div
            animate={{
              display: open ? "block" : "none",
              opacity: open ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <p className="text-sm font-medium text-white/90 whitespace-nowrap">{getDisplayName()}</p>
            <p className="text-xs text-white/40 truncate">{user?.email || 'email@example.com'}</p>
          </motion.div>
          <motion.div
            animate={{
              display: open ? "block" : "none",
              opacity: open ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-white/40 hover:text-red-400 transition-colors" />
            </button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

const AppSidebar: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </SidebarBody>
    </Sidebar>
  );
};

export default AppSidebar;
