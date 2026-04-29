import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleCalendarStatus {
  connected: boolean;
  calendar_id: string | null;
  connected_at: string | null;
}

export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    connected: false,
    calendar_id: null,
    connected_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus({ connected: false, calendar_id: null, connected_at: null });
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=status`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setStatus(result);
      }
    } catch (error) {
      console.error('Error checking Google Calendar status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Listen for OAuth callback message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-calendar-connected') {
        checkStatus();
        toast.success('Google Calendar conectado com sucesso!');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkStatus]);

  const connect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=authorize`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to get auth URL');

      const { url } = await response.json();
      
      // Open popup for OAuth
      const popup = window.open(url, 'google-calendar-auth', 'width=500,height=600,left=200,top=100');
      if (!popup) {
        toast.error('Popup bloqueado. Permita popups para este site.');
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast.error('Erro ao conectar Google Calendar');
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=disconnect`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (response.ok) {
        setStatus({ connected: false, calendar_id: null, connected_at: null });
        toast.success('Google Calendar desconectado');
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error('Erro ao desconectar');
    }
  }, []);

  const syncAppointment = useCallback(async (appointmentId: string, action: 'create' | 'update' | 'delete') => {
    if (!status.connected) return;

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action, appointment_id: appointmentId },
      });

      if (error) {
        console.error(`Error syncing appointment (${action}):`, error);
      } else {
        console.log(`[GoogleCalendar] ${action} synced:`, data);
      }
    } catch (error) {
      console.error(`Error syncing appointment (${action}):`, error);
    }
  }, [status.connected]);

  const fullSync = useCallback(async () => {
    if (!status.connected) {
      toast.error('Google Calendar não está conectado');
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'full-sync' },
      });

      if (error) throw error;

      toast.success(`Sincronização completa! ${data.synced || 0} exportados, ${data.imported || 0} importados`);
    } catch (error) {
      console.error('Error during full sync:', error);
      toast.error('Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  }, [status.connected]);

  return {
    status,
    loading,
    syncing,
    connect,
    disconnect,
    syncAppointment,
    fullSync,
    checkStatus,
  };
}
