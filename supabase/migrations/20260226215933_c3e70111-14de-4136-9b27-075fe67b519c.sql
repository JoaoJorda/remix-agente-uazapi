
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.appointment_type AS ENUM ('demo', 'meeting', 'support', 'followup');
CREATE TYPE public.conversation_status AS ENUM ('nina', 'human', 'paused');
CREATE TYPE public.member_role AS ENUM ('admin', 'manager', 'agent');
CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'disabled');
CREATE TYPE public.message_from AS ENUM ('user', 'nina', 'human');
CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read', 'failed', 'processing');
CREATE TYPE public.message_type AS ENUM ('text', 'audio', 'image', 'document', 'video');
CREATE TYPE public.queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public.team_assignment AS ENUM ('mateus', 'igor', 'fe', 'vendas', 'suporte');
CREATE TYPE whatsapp_provider_type AS ENUM ('official', 'evolution_self_hosted', 'evolution_cloud');
CREATE TYPE whatsapp_instance_status AS ENUM ('connected', 'connecting', 'disconnected', 'qr_required');

-- =============================================
-- BASE FUNCTION (no table deps)
-- =============================================
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE FUNCTION public.get_auth_user_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$ SELECT auth.uid() $$;

-- =============================================
-- TABLES (ordered by dependencies)
-- =============================================

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role DEFAULT 'user' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    avatar_url text,
    must_change_password boolean NOT NULL DEFAULT false,
    has_logged_in boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    phone_number text NOT NULL UNIQUE,
    whatsapp_id text,
    name text,
    call_name text,
    email text,
    profile_picture_url text,
    is_business boolean DEFAULT false,
    is_blocked boolean DEFAULT false,
    blocked_at timestamptz,
    blocked_reason text,
    tags text[] DEFAULT '{}',
    notes text,
    client_memory jsonb DEFAULT '{"last_updated": null, "lead_profile": {"interests": [], "lead_stage": "new", "objections": [], "products_discussed": [], "communication_style": "unknown", "qualification_score": 0}, "sales_intelligence": {"pain_points": [], "next_best_action": "qualify", "budget_indication": "unknown", "decision_timeline": "unknown"}, "interaction_summary": {"response_pattern": "unknown", "last_contact_reason": "", "total_conversations": 0, "preferred_contact_time": "unknown"}, "conversation_history": []}'::jsonb,
    first_contact_date timestamptz DEFAULT now() NOT NULL,
    last_activity timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ONLY public.contacts REPLICA IDENTITY FULL;

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    status public.conversation_status DEFAULT 'nina' NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    assigned_team public.team_assignment,
    assigned_user_id uuid,
    tags text[] DEFAULT '{}',
    nina_context jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    started_at timestamptz DEFAULT now() NOT NULL,
    last_message_at timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ONLY public.conversations REPLICA IDENTITY FULL;

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    reply_to_id uuid REFERENCES public.messages(id),
    whatsapp_message_id text,
    type public.message_type DEFAULT 'text' NOT NULL,
    from_type public.message_from NOT NULL,
    content text,
    media_url text,
    media_type text,
    status public.message_status DEFAULT 'sent' NOT NULL,
    processed_by_nina boolean DEFAULT false,
    nina_response_time integer,
    metadata jsonb DEFAULT '{}',
    sent_at timestamptz DEFAULT now() NOT NULL,
    delivered_at timestamptz,
    read_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.messages REPLICA IDENTITY FULL;

CREATE TABLE public.conversation_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
    current_state text DEFAULT 'idle' NOT NULL,
    last_action text,
    last_action_at timestamptz,
    scheduling_context jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    color text DEFAULT '#3b82f6',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

CREATE TABLE public.team_functions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role public.member_role DEFAULT 'agent' NOT NULL,
    status public.member_status DEFAULT 'invited' NOT NULL,
    avatar text,
    team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    function_id uuid REFERENCES public.team_functions(id) ON DELETE SET NULL,
    weight integer DEFAULT 1,
    last_active timestamptz,
    receives_meetings boolean DEFAULT false,
    phone text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.pipeline_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    color text DEFAULT 'border-slate-500' NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    ai_trigger_criteria text,
    is_ai_managed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ONLY public.pipeline_stages REPLICA IDENTITY FULL;

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
    title text NOT NULL,
    company text,
    value numeric DEFAULT 0,
    stage text DEFAULT 'new',
    priority text DEFAULT 'medium',
    tags text[] DEFAULT '{}',
    due_date date,
    owner_id uuid REFERENCES public.team_members(id),
    notes text,
    lost_reason text,
    won_at timestamptz,
    lost_at timestamptz,
    stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE ONLY public.deals REPLICA IDENTITY FULL;

CREATE TABLE public.deal_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    type text DEFAULT 'note' NOT NULL,
    title text NOT NULL,
    description text,
    scheduled_at timestamptz,
    completed_at timestamptz,
    is_completed boolean DEFAULT false,
    created_by uuid REFERENCES public.team_members(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    date date NOT NULL,
    "time" time NOT NULL,
    duration integer DEFAULT 60 NOT NULL,
    type public.appointment_type DEFAULT 'meeting' NOT NULL,
    attendees text[] DEFAULT '{}',
    contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
    meeting_url text,
    status text DEFAULT 'scheduled',
    metadata jsonb DEFAULT '{}',
    assigned_closer_id uuid REFERENCES public.team_members(id),
    assigned_closer_name text,
    assigned_closer_email text,
    assigned_closer_phone text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.tag_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    key text NOT NULL,
    label text NOT NULL,
    color text DEFAULT '#3b82f6' NOT NULL,
    category text DEFAULT 'custom' NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(user_id, key)
);

CREATE TABLE public.nina_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    is_active boolean DEFAULT true NOT NULL,
    system_prompt_override text,
    test_system_prompt text,
    elevenlabs_api_key text,
    elevenlabs_voice_id text DEFAULT '33B4UnXyTNbgLmdEDh5P' NOT NULL,
    elevenlabs_model text DEFAULT 'eleven_turbo_v2_5',
    elevenlabs_stability numeric DEFAULT 0.75 NOT NULL,
    elevenlabs_similarity_boost numeric DEFAULT 0.80 NOT NULL,
    elevenlabs_style numeric DEFAULT 0.30 NOT NULL,
    elevenlabs_speaker_boost boolean DEFAULT true NOT NULL,
    elevenlabs_speed numeric DEFAULT 1.0,
    whatsapp_access_token text,
    whatsapp_phone_number_id text,
    whatsapp_verify_token text DEFAULT 'viver-de-ia-nina-webhook',
    auto_response_enabled boolean DEFAULT true NOT NULL,
    adaptive_response_enabled boolean DEFAULT true NOT NULL,
    message_breaking_enabled boolean DEFAULT true NOT NULL,
    response_delay_min integer DEFAULT 1000 NOT NULL,
    response_delay_max integer DEFAULT 3000 NOT NULL,
    timezone text DEFAULT 'America/Sao_Paulo' NOT NULL,
    business_hours_start time DEFAULT '09:00:00' NOT NULL,
    business_hours_end time DEFAULT '18:00:00' NOT NULL,
    business_days integer[] DEFAULT '{1,2,3,4,5}' NOT NULL,
    async_booking_enabled boolean DEFAULT false,
    route_all_to_receiver_enabled boolean DEFAULT false NOT NULL,
    test_phone_numbers jsonb,
    company_name text,
    sdr_name text,
    ai_model_mode text DEFAULT 'flash',
    audio_response_enabled boolean DEFAULT false,
    ai_scheduling_enabled boolean DEFAULT true,
    whatsapp_business_account_id text,
    evolution_api_url text,
    evolution_api_key text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.message_grouping_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    whatsapp_message_id text NOT NULL,
    phone_number_id text NOT NULL,
    message_data jsonb NOT NULL,
    contacts_data jsonb,
    processed boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    process_after timestamptz DEFAULT (now() + interval '20 seconds'),
    message_id uuid REFERENCES public.messages(id)
);

CREATE TABLE public.message_processing_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    whatsapp_message_id text NOT NULL,
    phone_number_id text NOT NULL,
    raw_data jsonb NOT NULL,
    status public.queue_status DEFAULT 'pending' NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    error_message text,
    scheduled_for timestamptz DEFAULT now(),
    processed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.nina_processing_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    message_id uuid NOT NULL UNIQUE,
    conversation_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    context_data jsonb,
    status public.queue_status DEFAULT 'pending' NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    error_message text,
    scheduled_for timestamptz DEFAULT now(),
    processed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.send_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    message_type text DEFAULT 'text' NOT NULL,
    from_type text DEFAULT 'nina' NOT NULL,
    content text,
    media_url text,
    metadata jsonb DEFAULT '{}',
    status public.queue_status DEFAULT 'pending' NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    error_message text,
    scheduled_at timestamptz DEFAULT now(),
    sent_at timestamptz,
    message_id uuid REFERENCES public.messages(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.whatsapp_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    name text NOT NULL,
    instance_name text NOT NULL UNIQUE,
    provider_type whatsapp_provider_type NOT NULL DEFAULT 'official',
    instance_id_external text,
    phone_number text,
    status whatsapp_instance_status DEFAULT 'disconnected',
    qr_code text,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    reply_to_groups boolean NOT NULL DEFAULT false,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.whatsapp_instance_secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    instance_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    api_key text NOT NULL,
    api_url text NOT NULL,
    verify_token text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.round_robin_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    function_id uuid NOT NULL UNIQUE REFERENCES public.team_functions(id) ON DELETE CASCADE,
    last_assigned_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
    last_assigned_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.broadcast_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    message_template text NOT NULL,
    message_type text NOT NULL DEFAULT 'text',
    media_url text,
    instance_id uuid REFERENCES public.whatsapp_instances(id),
    delay_min_ms integer NOT NULL DEFAULT 5000,
    delay_max_ms integer NOT NULL DEFAULT 15000,
    column_mapping jsonb NOT NULL DEFAULT '{}',
    custom_fields text[] NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'draft',
    total_recipients integer NOT NULL DEFAULT 0,
    sent_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    batch_size integer NOT NULL DEFAULT 10,
    delay_between_batches integer NOT NULL DEFAULT 300,
    next_batch_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.broadcast_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
    phone_number text NOT NULL,
    variables jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    sent_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.design_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    logo_url text,
    primary_color text DEFAULT '37 30% 57%',
    sidebar_bg_color text DEFAULT '0 0% 10%',
    sidebar_primary_color text DEFAULT '37 30% 57%',
    accent_color text DEFAULT '40 33% 96%',
    company_display_name text,
    company_subtitle text,
    body_font text DEFAULT 'Inter',
    heading_font text DEFAULT 'Inter',
    sidebar_identity_font text DEFAULT 'Playfair Display',
    sidebar_identity_enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add instance_id columns
ALTER TABLE public.contacts ADD COLUMN instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;
ALTER TABLE public.conversations ADD COLUMN instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;
ALTER TABLE public.send_queue ADD COLUMN instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;
ALTER TABLE public.message_grouping_queue ADD COLUMN instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- =============================================
-- FUNCTIONS (that depend on tables)
-- =============================================

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_conversation_last_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
    AS $$
BEGIN
    UPDATE public.conversations SET last_message_at = NEW.sent_at WHERE id = NEW.conversation_id;
    UPDATE public.contacts SET last_activity = NEW.sent_at WHERE id = (
        SELECT contact_id FROM public.conversations WHERE id = NEW.conversation_id
    );
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_conversation_state(p_conversation_id uuid, p_new_state text, p_action text DEFAULT NULL, p_context jsonb DEFAULT NULL) RETURNS public.conversation_states
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
DECLARE state_record public.conversation_states;
BEGIN
    INSERT INTO public.conversation_states (conversation_id, current_state, last_action, last_action_at, scheduling_context)
    VALUES (p_conversation_id, p_new_state, p_action, now(), COALESCE(p_context, '{}'))
    ON CONFLICT (conversation_id) DO UPDATE SET
        current_state = EXCLUDED.current_state, last_action = EXCLUDED.last_action,
        last_action_at = EXCLUDED.last_action_at,
        scheduling_context = CASE WHEN EXCLUDED.scheduling_context = '{}' THEN conversation_states.scheduling_context ELSE EXCLUDED.scheduling_context END,
        updated_at = now()
    RETURNING * INTO state_record;
    RETURN state_record;
END;
$$;

CREATE FUNCTION public.get_or_create_conversation_state(p_conversation_id uuid) RETURNS public.conversation_states
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
DECLARE state_record public.conversation_states;
BEGIN
    SELECT * INTO state_record FROM public.conversation_states WHERE conversation_id = p_conversation_id;
    IF NOT FOUND THEN
        INSERT INTO public.conversation_states (conversation_id, current_state) VALUES (p_conversation_id, 'idle') RETURNING * INTO state_record;
    END IF;
    RETURN state_record;
END;
$$;

CREATE FUNCTION public.update_client_memory(p_contact_id uuid, p_new_memory jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
    AS $$ BEGIN UPDATE public.contacts SET client_memory = p_new_memory, updated_at = now() WHERE id = p_contact_id; END; $$;

CREATE FUNCTION public.create_deal_for_new_contact() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
DECLARE first_stage_id UUID;
BEGIN
  SELECT id INTO first_stage_id FROM public.pipeline_stages WHERE is_active = true AND (user_id = NEW.user_id OR user_id IS NULL) ORDER BY position LIMIT 1;
  IF first_stage_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO deals (contact_id, title, company, stage, stage_id, priority, user_id)
  VALUES (NEW.id, COALESCE(NEW.name, NEW.call_name, 'Novo Lead'), NULL, 'new', first_stage_id, 'medium', NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.cleanup_processed_message_queue() RETURNS void
    LANGUAGE plpgsql SET search_path TO 'public'
    AS $$ BEGIN DELETE FROM public.message_grouping_queue WHERE processed = true AND created_at < now() - interval '1 hour'; END; $$;

CREATE FUNCTION public.cleanup_processed_queues() RETURNS void
    LANGUAGE plpgsql SET search_path TO 'public'
    AS $$
BEGIN
    DELETE FROM public.message_processing_queue WHERE status = 'completed' AND processed_at < now() - interval '24 hours';
    DELETE FROM public.nina_processing_queue WHERE status = 'completed' AND processed_at < now() - interval '24 hours';
    DELETE FROM public.send_queue WHERE status = 'completed' AND sent_at < now() - interval '24 hours';
    DELETE FROM public.message_processing_queue WHERE status = 'failed' AND updated_at < now() - interval '7 days';
    DELETE FROM public.nina_processing_queue WHERE status = 'failed' AND updated_at < now() - interval '7 days';
    DELETE FROM public.send_queue WHERE status = 'failed' AND updated_at < now() - interval '7 days';
END;
$$;

CREATE FUNCTION public.claim_message_processing_batch(p_limit integer DEFAULT 50) RETURNS SETOF public.message_processing_queue
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
    AS $$
BEGIN
    RETURN QUERY
    WITH cte AS (
        SELECT id FROM public.message_processing_queue WHERE status = 'pending' AND (scheduled_for IS NULL OR scheduled_for <= now())
        ORDER BY priority DESC, scheduled_for ASC NULLS FIRST, created_at ASC FOR UPDATE SKIP LOCKED LIMIT p_limit
    )
    UPDATE public.message_processing_queue m SET status = 'processing', updated_at = now() WHERE m.id IN (SELECT id FROM cte) RETURNING m.*;
END;
$$;

CREATE FUNCTION public.claim_nina_processing_batch(p_limit integer DEFAULT 50) RETURNS SETOF public.nina_processing_queue
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
    AS $$
BEGIN
    UPDATE public.nina_processing_queue SET status = 'pending', updated_at = now(), scheduled_for = now(), retry_count = retry_count + 1
    WHERE status = 'processing' AND updated_at < now() - interval '2 minutes';
    RETURN QUERY
    WITH cte AS (
        SELECT id FROM public.nina_processing_queue WHERE status = 'pending' AND (scheduled_for IS NULL OR scheduled_for <= now())
        ORDER BY priority DESC, scheduled_for ASC NULLS FIRST, created_at ASC FOR UPDATE SKIP LOCKED LIMIT p_limit
    )
    UPDATE public.nina_processing_queue n SET status = 'processing', updated_at = now() WHERE n.id IN (SELECT id FROM cte) RETURNING n.*;
END;
$$;

CREATE FUNCTION public.claim_send_queue_batch(p_limit integer DEFAULT 10) RETURNS SETOF public.send_queue
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
    AS $$
BEGIN
    RETURN QUERY
    WITH cte AS (
        SELECT id FROM public.send_queue WHERE status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= now())
        ORDER BY priority DESC, scheduled_at ASC NULLS FIRST, created_at ASC FOR UPDATE SKIP LOCKED LIMIT p_limit
    )
    UPDATE public.send_queue s SET status = 'processing', updated_at = now() WHERE s.id IN (SELECT id FROM cte) RETURNING s.*;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_single_default_instance() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.whatsapp_instances SET is_default = false WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_next_closer()
RETURNS TABLE(member_id uuid, member_name text, member_email text, member_phone text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE closer_function_id uuid; last_member_id uuid; next_member RECORD;
BEGIN
  SELECT id INTO closer_function_id FROM team_functions WHERE LOWER(name) = 'closer' AND is_active = true LIMIT 1;
  IF closer_function_id IS NULL THEN RETURN; END IF;
  SELECT last_assigned_member_id INTO last_member_id FROM round_robin_state WHERE function_id = closer_function_id;
  SELECT tm.id, tm.name, tm.email, tm.phone INTO next_member FROM team_members tm
  WHERE tm.function_id = closer_function_id AND tm.status IN ('active', 'invited') AND tm.receives_meetings = true
    AND (last_member_id IS NULL OR tm.created_at > (SELECT created_at FROM team_members WHERE id = last_member_id))
  ORDER BY tm.created_at ASC LIMIT 1;
  IF next_member.id IS NULL THEN
    SELECT tm.id, tm.name, tm.email, tm.phone INTO next_member FROM team_members tm
    WHERE tm.function_id = closer_function_id AND tm.status IN ('active', 'invited') AND tm.receives_meetings = true
    ORDER BY tm.created_at ASC LIMIT 1;
  END IF;
  IF next_member.id IS NULL THEN RETURN; END IF;
  INSERT INTO round_robin_state (function_id, last_assigned_member_id, last_assigned_at)
  VALUES (closer_function_id, next_member.id, now())
  ON CONFLICT (function_id) DO UPDATE SET last_assigned_member_id = next_member.id, last_assigned_at = now(), updated_at = now();
  member_id := next_member.id; member_name := next_member.name; member_email := next_member.email; member_phone := next_member.phone;
  RETURN NEXT;
END;
$$;

-- =============================================
-- VIEW
-- =============================================
CREATE VIEW public.contacts_with_stats WITH (security_invoker='true') AS
 SELECT c.id, c.phone_number, c.whatsapp_id, c.name, c.call_name, c.email,
    c.profile_picture_url, c.is_business, c.is_blocked, c.blocked_at, c.blocked_reason,
    c.tags, c.notes, c.client_memory, c.first_contact_date, c.last_activity,
    c.created_at, c.updated_at, c.user_id,
    COALESCE(msg_stats.total_messages, 0::bigint) AS total_messages,
    COALESCE(msg_stats.nina_messages, 0::bigint) AS nina_messages,
    COALESCE(msg_stats.user_messages, 0::bigint) AS user_messages,
    COALESCE(msg_stats.human_messages, 0::bigint) AS human_messages
   FROM public.contacts c
     LEFT JOIN (
       SELECT conv.contact_id,
            count(m.id) AS total_messages,
            count(CASE WHEN m.from_type = 'nina' THEN 1 END) AS nina_messages,
            count(CASE WHEN m.from_type = 'user' THEN 1 END) AS user_messages,
            count(CASE WHEN m.from_type = 'human' THEN 1 END) AS human_messages
       FROM public.conversations conv
         JOIN public.messages m ON m.conversation_id = conv.id
       GROUP BY conv.contact_id
     ) msg_stats ON msg_stats.contact_id = c.id;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at DESC);
CREATE INDEX idx_contacts_is_blocked ON public.contacts(is_blocked);
CREATE INDEX idx_contacts_last_activity ON public.contacts(last_activity DESC);
CREATE INDEX idx_contacts_phone_number ON public.contacts(phone_number);
CREATE INDEX idx_contacts_tags ON public.contacts USING gin(tags);
CREATE INDEX idx_contacts_whatsapp_id ON public.contacts(whatsapp_id);
CREATE INDEX idx_contacts_instance_id ON public.contacts(instance_id);
CREATE INDEX idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_conversations_is_active ON public.conversations(is_active);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_tags ON public.conversations USING gin(tags);
CREATE INDEX idx_conversations_instance_id ON public.conversations(instance_id);
CREATE INDEX idx_conversation_states_conversation_id ON public.conversation_states(conversation_id);
CREATE INDEX idx_conversation_states_current_state ON public.conversation_states(current_state);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_from_type ON public.messages(from_type);
CREATE INDEX idx_messages_sent_at ON public.messages(sent_at DESC);
CREATE INDEX idx_messages_status ON public.messages(status);
CREATE INDEX idx_messages_whatsapp_message_id ON public.messages(whatsapp_message_id);
CREATE UNIQUE INDEX messages_whatsapp_message_id_unique ON public.messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX idx_deal_activities_created_at ON public.deal_activities(created_at DESC);
CREATE INDEX idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX idx_message_grouping_queue_created_at ON public.message_grouping_queue(created_at);
CREATE INDEX idx_message_grouping_queue_message_id ON public.message_grouping_queue(message_id);
CREATE INDEX idx_message_grouping_queue_phone_number_id ON public.message_grouping_queue(phone_number_id);
CREATE INDEX idx_message_grouping_queue_processed ON public.message_grouping_queue(processed);
CREATE INDEX idx_message_grouping_ready ON public.message_grouping_queue(process_after, processed) WHERE processed = false;
CREATE INDEX idx_message_grouping_queue_instance_id ON public.message_grouping_queue(instance_id);
CREATE INDEX idx_message_processing_queue_priority ON public.message_processing_queue(priority DESC);
CREATE INDEX idx_message_processing_queue_scheduled_for ON public.message_processing_queue(scheduled_for);
CREATE INDEX idx_message_processing_queue_status ON public.message_processing_queue(status);
CREATE INDEX idx_nina_processing_queue_conversation_id ON public.nina_processing_queue(conversation_id);
CREATE INDEX idx_nina_processing_queue_message_id ON public.nina_processing_queue(message_id);
CREATE INDEX idx_nina_processing_queue_priority ON public.nina_processing_queue(priority DESC);
CREATE INDEX idx_nina_processing_queue_scheduled_for ON public.nina_processing_queue(scheduled_for);
CREATE INDEX idx_nina_processing_queue_status ON public.nina_processing_queue(status);
CREATE INDEX idx_nina_settings_is_active ON public.nina_settings(is_active);
CREATE INDEX idx_pipeline_stages_is_active ON public.pipeline_stages(is_active);
CREATE INDEX idx_pipeline_stages_position ON public.pipeline_stages("position");
CREATE INDEX idx_send_queue_contact_id ON public.send_queue(contact_id);
CREATE INDEX idx_send_queue_conversation_id ON public.send_queue(conversation_id);
CREATE INDEX idx_send_queue_priority ON public.send_queue(priority DESC);
CREATE INDEX idx_send_queue_scheduled_at ON public.send_queue(scheduled_at);
CREATE INDEX idx_send_queue_status ON public.send_queue(status);
CREATE INDEX idx_send_queue_instance_id ON public.send_queue(instance_id);
CREATE INDEX idx_tag_definitions_category ON public.tag_definitions(category);
CREATE INDEX idx_tag_definitions_key ON public.tag_definitions(key);
CREATE INDEX idx_appointments_metadata_source ON public.appointments USING gin(metadata jsonb_path_ops);
CREATE INDEX idx_whatsapp_instances_status ON public.whatsapp_instances(status);
CREATE INDEX idx_whatsapp_instances_provider_type ON public.whatsapp_instances(provider_type);
CREATE INDEX idx_whatsapp_instances_is_default ON public.whatsapp_instances(is_default) WHERE is_default = true;
CREATE INDEX idx_broadcast_campaigns_user_id ON public.broadcast_campaigns(user_id);
CREATE INDEX idx_broadcast_campaigns_status ON public.broadcast_campaigns(status);
CREATE INDEX idx_broadcast_recipients_campaign_id ON public.broadcast_recipients(campaign_id);
CREATE INDEX idx_broadcast_recipients_status ON public.broadcast_recipients(status);
CREATE INDEX idx_broadcast_recipients_campaign_status ON public.broadcast_recipients(campaign_id, status);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversation_states_updated_at BEFORE UPDATE ON public.conversation_states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deal_activities_updated_at BEFORE UPDATE ON public.deal_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nina_settings_updated_at BEFORE UPDATE ON public.nina_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tag_definitions_updated_at BEFORE UPDATE ON public.tag_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_functions_updated_at BEFORE UPDATE ON public.team_functions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_message_processing_queue_updated_at BEFORE UPDATE ON public.message_processing_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nina_processing_queue_updated_at BEFORE UPDATE ON public.nina_processing_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_send_queue_updated_at BEFORE UPDATE ON public.send_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_instance_secrets_updated_at BEFORE UPDATE ON public.whatsapp_instance_secrets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_round_robin_state_updated_at BEFORE UPDATE ON public.round_robin_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_broadcast_campaigns_updated_at BEFORE UPDATE ON public.broadcast_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_design_settings_updated_at BEFORE UPDATE ON public.design_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER auto_create_deal_on_contact AFTER INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.create_deal_for_new_contact();
CREATE TRIGGER update_conversation_last_message_trigger AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();
CREATE TRIGGER ensure_single_default_instance_trigger BEFORE INSERT OR UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION ensure_single_default_instance();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nina_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_grouping_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nina_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instance_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_robin_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can access all contacts" ON public.contacts USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access all conversations" ON public.conversations USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access all messages" ON public.messages USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access all deals" ON public.deals FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access all appointments" ON public.appointments FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can access activities of their deals" ON public.deal_activities USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access conversation_states" ON public.conversation_states USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can modify nina_settings" ON public.nina_settings TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read nina_settings" ON public.nina_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify pipeline_stages" ON public.pipeline_stages TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read pipeline_stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify tag_definitions" ON public.tag_definitions TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read tag_definitions" ON public.tag_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify teams" ON public.teams TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify team_functions" ON public.team_functions TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read team_functions" ON public.team_functions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify team_members" ON public.team_members TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read team_members" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all operations on message_grouping_queue" ON public.message_grouping_queue USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on message_processing_queue" ON public.message_processing_queue USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on nina_processing_queue" ON public.nina_processing_queue USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on send_queue" ON public.send_queue USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage all whatsapp_instances" ON public.whatsapp_instances FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can read whatsapp_instances" ON public.whatsapp_instances FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update whatsapp_instances" ON public.whatsapp_instances FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage whatsapp_instance_secrets" ON public.whatsapp_instance_secrets FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Allow all operations on round_robin_state" ON public.round_robin_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can select own campaigns" ON public.broadcast_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON public.broadcast_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON public.broadcast_campaigns FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON public.broadcast_campaigns FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can select own recipients" ON public.broadcast_recipients FOR SELECT USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own recipients" ON public.broadcast_recipients FOR INSERT WITH CHECK (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own recipients" ON public.broadcast_recipients FOR UPDATE USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own recipients" ON public.broadcast_recipients FOR DELETE USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));
CREATE POLICY "Admins can modify design_settings" ON public.design_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read design_settings" ON public.design_settings FOR SELECT USING (true);

-- =============================================
-- STORAGE
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
CREATE POLICY "Admins can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Admins can delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND has_role(auth.uid(), 'admin'));

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_functions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_campaigns;
