import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { name, email, phone, role, team_id, function_id, weight } = await req.json()

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'name e email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Tentar gerar link de convite (novo usuário) ou magic link (usuário existente)
    let inviteData: any = null
    let inviteLink: string | null = null

    const siteUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || ''

    const { data: newInvite, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { 
        data: { full_name: name },
        redirectTo: `${siteUrl}/set-password`,
      },
    })

    if (inviteError) {
      // Se o usuário já existe, gerar magic link de login para ele
      if (inviteError.code === 'email_exists' || inviteError.status === 422) {
        console.log('Usuário já existe, gerando magic link de acesso...')
        const { data: magicData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: `${siteUrl}/set-password` },
        })
        if (magicError) {
          console.error('Erro ao gerar magic link:', magicError)
          return new Response(JSON.stringify({ error: magicError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        inviteData = magicData
        inviteLink = magicData?.properties?.action_link ?? null
      } else {
        console.error('Erro ao gerar link de convite:', inviteError)
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      inviteData = newInvite
      inviteLink = newInvite?.properties?.action_link ?? null
    }

    // 2. Criar ou atualizar o membro na tabela team_members
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .upsert({
        name,
        email,
        phone: phone || null,
        role: role || 'agent',
        team_id: team_id || null,
        function_id: function_id || null,
        weight: weight || 1,
        status: 'invited',
        user_id: inviteData?.user?.id ?? null,
      }, { onConflict: 'email' })

    if (memberError) {
      console.error('Erro ao criar membro:', memberError)
    }

    // 3. Marcar no perfil que o usuário precisa trocar a senha
    const invitedUserId = inviteData?.user?.id
    if (invitedUserId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: invitedUserId,
          must_change_password: true,
        }, { onConflict: 'user_id' })

      if (profileError) {
        console.error('Erro ao marcar must_change_password no perfil:', profileError)
      }
    }

    return new Response(JSON.stringify({ success: true, invite_link: inviteLink, user_id: invitedUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
