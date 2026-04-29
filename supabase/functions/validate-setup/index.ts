import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ValidationResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: ValidationResult[] = [];

    // 1. Check nina_settings (triple fallback for single-tenant)
    let settings = null;
    let settingsError = null;

    // 1a. Try by user_id
    const { data: userSettings, error: err1 } = await supabase
      .from('nina_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    settings = userSettings;
    settingsError = err1;

    // 1b. Fallback: global (user_id IS NULL)
    if (!settings) {
      const { data: globalSettings, error: err2 } = await supabase
        .from('nina_settings')
        .select('*')
        .is('user_id', null)
        .maybeSingle();
      settings = globalSettings;
      if (!settingsError) settingsError = err2;
    }

    // 1c. Last fallback: any settings
    if (!settings) {
      const { data: anySettings, error: err3 } = await supabase
        .from('nina_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      settings = anySettings;
      if (!settingsError) settingsError = err3;
    }

    if (settingsError || !settings) {
      results.push({
        component: 'nina_settings',
        status: 'error',
        message: 'Configurações não encontradas',
        details: 'Execute a inicialização do sistema',
      });
    } else {
      // Check identity
      if (settings.company_name && settings.sdr_name) {
        results.push({
          component: 'identity',
          status: 'ok',
          message: `${settings.sdr_name} - ${settings.company_name}`,
        });
      } else {
        results.push({
          component: 'identity',
          status: 'warning',
          message: 'Identidade não configurada',
          details: 'Configure nome da empresa e SDR',
        });
      }

      // Check WhatsApp (uazapi)
      if (settings.uazapi_base_url && settings.uazapi_token) {
        // Test uazapi connection
        try {
          const baseUrl = settings.uazapi_base_url.replace(/\/$/, '');
          const uazapiResponse = await fetch(`${baseUrl}/instance/all`, {
            headers: {
              'Content-Type': 'application/json',
              'admintoken': settings.uazapi_token,
            },
          });
          
          if (uazapiResponse.ok) {
            // Check if there's a connected instance in the database
            const { data: connectedInstances } = await supabase
              .from('whatsapp_instances')
              .select('id, status, name')
              .eq('is_active', true)
              .eq('status', 'connected')
              .limit(1);

            if (connectedInstances && connectedInstances.length > 0) {
              results.push({
                component: 'whatsapp',
                status: 'ok',
                message: `uazapi conectada: ${connectedInstances[0].name || 'Instância ativa'}`,
              });
            } else {
              results.push({
                component: 'whatsapp',
                status: 'warning',
                message: 'uazapi acessível, mas nenhuma instância conectada',
                details: 'Conecte uma instância via QR Code',
              });
            }
          } else {
            results.push({
              component: 'whatsapp',
              status: 'error',
              message: 'Credenciais da uazapi inválidas',
              details: 'Verifique URL e Token',
            });
          }
        } catch (e) {
          results.push({
            component: 'whatsapp',
            status: 'warning',
            message: 'Não foi possível validar uazapi',
            details: 'Erro de conexão com a API',
          });
        }
      } else {
        results.push({
          component: 'whatsapp',
          status: 'error',
          message: 'uazapi não configurada',
          details: 'Configure a URL e Token da uazapi',
        });
      }

      // Check Agent Prompt
      if (settings.system_prompt_override && settings.system_prompt_override.length > 100) {
        results.push({
          component: 'agent_prompt',
          status: 'ok',
          message: 'Prompt do agente configurado',
        });
      } else {
        results.push({
          component: 'agent_prompt',
          status: 'warning',
          message: 'Prompt do agente não personalizado',
          details: 'Recomendamos configurar um prompt personalizado',
        });
      }

      // Check ElevenLabs (optional)
      if (settings.elevenlabs_api_key) {
        try {
          const elResponse = await fetch('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': settings.elevenlabs_api_key },
          });
          
          if (elResponse.ok) {
            results.push({
              component: 'elevenlabs',
              status: 'ok',
              message: 'ElevenLabs conectado',
            });
          } else {
            results.push({
              component: 'elevenlabs',
              status: 'error',
              message: 'API Key do ElevenLabs inválida',
            });
          }
        } catch (e) {
          results.push({
            component: 'elevenlabs',
            status: 'warning',
            message: 'Não foi possível validar ElevenLabs',
          });
        }
      } else {
        results.push({
          component: 'elevenlabs',
          status: 'warning',
          message: 'ElevenLabs não configurado (opcional)',
          details: 'Respostas em áudio não estarão disponíveis',
        });
      }

      // Check Business Hours
      if (settings.business_hours_start && settings.business_hours_end) {
        results.push({
          component: 'business_hours',
          status: 'ok',
          message: `Horário: ${settings.business_hours_start} - ${settings.business_hours_end}`,
        });
      } else {
        results.push({
          component: 'business_hours',
          status: 'warning',
          message: 'Horário comercial não configurado',
        });
      }
    }

    // 2. Check Lovable AI Key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey && lovableApiKey.length > 10) {
      results.push({
        component: 'lovable_ai',
        status: 'ok',
        message: 'Lovable AI configurada',
      });
    } else {
      results.push({
        component: 'lovable_ai',
        status: 'error',
        message: 'LOVABLE_API_KEY não configurada',
        details: 'A IA não funcionará sem esta chave',
      });
    }

    // 3. Check Pipeline Stages (single-tenant - no user_id filter)
    const { count: stagesCount } = await supabase
      .from('pipeline_stages')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (stagesCount && stagesCount > 0) {
      results.push({
        component: 'pipeline',
        status: 'ok',
        message: `${stagesCount} estágios no pipeline`,
      });
    } else {
      results.push({
        component: 'pipeline',
        status: 'warning',
        message: 'Pipeline não configurado',
      });
    }

    // 4. Check Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[validate-setup] Profile check for user:', user.id, '- Result:', profile ? 'FOUND' : 'NOT FOUND', profileError ? `Error: ${profileError.message}` : '');

    if (profile) {
      results.push({
        component: 'profile',
        status: 'ok',
        message: profile.full_name || 'Perfil criado',
      });
    } else {
      // Try to find any profile for this user (debugging)
      const { data: anyProfile, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .limit(5);
      console.log('[validate-setup] Debug - Total profiles in DB:', count, '- Sample:', anyProfile?.map(p => ({ id: p.id, user_id: p.user_id })));
      
      results.push({
        component: 'profile',
        status: 'warning',
        message: 'Perfil não encontrado',
        details: profileError?.message,
      });
    }

    // Calculate overall status
    const hasErrors = results.some(r => r.status === 'error');
    const hasWarnings = results.some(r => r.status === 'warning');
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

    // Count by status
    const okCount = results.filter(r => r.status === 'ok').length;
    const totalCount = results.length;

    return new Response(JSON.stringify({
      results,
      overallStatus,
      summary: {
        ok: okCount,
        total: totalCount,
        percentage: Math.round((okCount / totalCount) * 100),
      },
      message: overallStatus === 'ok' 
        ? '✅ Tudo configurado corretamente!' 
        : overallStatus === 'warning'
        ? '⚠️ Sistema funcional, mas há itens opcionais pendentes'
        : '❌ Há configurações obrigatórias pendentes',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in validate-setup:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
