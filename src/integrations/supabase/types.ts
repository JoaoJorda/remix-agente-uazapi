export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          assigned_closer_email: string | null
          assigned_closer_id: string | null
          assigned_closer_name: string | null
          assigned_closer_phone: string | null
          attendees: string[] | null
          contact_id: string | null
          created_at: string
          date: string
          description: string | null
          duration: number
          google_event_id: string | null
          id: string
          meeting_url: string | null
          metadata: Json | null
          status: string | null
          time: string
          title: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_closer_email?: string | null
          assigned_closer_id?: string | null
          assigned_closer_name?: string | null
          assigned_closer_phone?: string | null
          attendees?: string[] | null
          contact_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          duration?: number
          google_event_id?: string | null
          id?: string
          meeting_url?: string | null
          metadata?: Json | null
          status?: string | null
          time: string
          title: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_closer_email?: string | null
          assigned_closer_id?: string | null
          assigned_closer_name?: string | null
          assigned_closer_phone?: string | null
          attendees?: string[] | null
          contact_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          duration?: number
          google_event_id?: string | null
          id?: string
          meeting_url?: string | null
          metadata?: Json | null
          status?: string | null
          time?: string
          title?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_assigned_closer_id_fkey"
            columns: ["assigned_closer_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_campaigns: {
        Row: {
          batch_size: number
          column_mapping: Json
          completed_at: string | null
          created_at: string
          custom_fields: string[]
          delay_between_batches: number
          delay_max_ms: number
          delay_min_ms: number
          failed_count: number
          id: string
          instance_id: string | null
          media_url: string | null
          message_template: string
          message_type: string
          name: string
          next_batch_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          total_recipients: number
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_size?: number
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          custom_fields?: string[]
          delay_between_batches?: number
          delay_max_ms?: number
          delay_min_ms?: number
          failed_count?: number
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_template: string
          message_type?: string
          name: string
          next_batch_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_size?: number
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          custom_fields?: string[]
          delay_between_batches?: number
          delay_max_ms?: number
          delay_min_ms?: number
          failed_count?: number
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_template?: string
          message_type?: string
          name?: string
          next_batch_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_campaigns_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          phone_number: string
          sent_at: string | null
          status: string
          variables: Json
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          phone_number: string
          sent_at?: string | null
          status?: string
          variables?: Json
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "broadcast_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          call_name: string | null
          client_memory: Json | null
          created_at: string
          email: string | null
          first_contact_date: string
          id: string
          instance_id: string | null
          is_blocked: boolean | null
          is_business: boolean | null
          last_activity: string
          name: string | null
          notes: string | null
          phone_number: string
          profile_picture_url: string | null
          tags: string[] | null
          updated_at: string
          user_id: string | null
          whatsapp_id: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          call_name?: string | null
          client_memory?: Json | null
          created_at?: string
          email?: string | null
          first_contact_date?: string
          id?: string
          instance_id?: string | null
          is_blocked?: boolean | null
          is_business?: boolean | null
          last_activity?: string
          name?: string | null
          notes?: string | null
          phone_number: string
          profile_picture_url?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          call_name?: string | null
          client_memory?: Json | null
          created_at?: string
          email?: string | null
          first_contact_date?: string
          id?: string
          instance_id?: string | null
          is_blocked?: boolean | null
          is_business?: boolean | null
          last_activity?: string
          name?: string | null
          notes?: string | null
          phone_number?: string
          profile_picture_url?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_states: {
        Row: {
          conversation_id: string
          created_at: string
          current_state: string
          id: string
          last_action: string | null
          last_action_at: string | null
          scheduling_context: Json | null
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          current_state?: string
          id?: string
          last_action?: string | null
          last_action_at?: string | null
          scheduling_context?: Json | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          current_state?: string
          id?: string
          last_action?: string | null
          last_action_at?: string | null
          scheduling_context?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_team: Database["public"]["Enums"]["team_assignment"] | null
          assigned_user_id: string | null
          contact_id: string
          created_at: string
          id: string
          instance_id: string | null
          is_active: boolean
          last_message_at: string
          metadata: Json | null
          nina_context: Json | null
          started_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_team?: Database["public"]["Enums"]["team_assignment"] | null
          assigned_user_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          instance_id?: string | null
          is_active?: boolean
          last_message_at?: string
          metadata?: Json | null
          nina_context?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_team?: Database["public"]["Enums"]["team_assignment"] | null
          assigned_user_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          is_active?: boolean
          last_message_at?: string
          metadata?: Json | null
          nina_context?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string
          description: string | null
          id: string
          is_completed: boolean | null
          scheduled_at: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          scheduled_at?: string | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          scheduled_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          company: string | null
          contact_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          lost_at: string | null
          lost_reason: string | null
          notes: string | null
          owner_id: string | null
          priority: string | null
          stage: string | null
          stage_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          value: number | null
          won_at: string | null
        }
        Insert: {
          company?: string | null
          contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          stage?: string | null
          stage_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          won_at?: string | null
        }
        Update: {
          company?: string | null
          contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          stage?: string | null
          stage_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      design_settings: {
        Row: {
          accent_color: string | null
          body_font: string | null
          company_display_name: string | null
          company_subtitle: string | null
          created_at: string | null
          heading_font: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          sidebar_bg_color: string | null
          sidebar_identity_enabled: boolean | null
          sidebar_identity_font: string | null
          sidebar_primary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          body_font?: string | null
          company_display_name?: string | null
          company_subtitle?: string | null
          created_at?: string | null
          heading_font?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          sidebar_bg_color?: string | null
          sidebar_identity_enabled?: boolean | null
          sidebar_identity_font?: string | null
          sidebar_primary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          body_font?: string | null
          company_display_name?: string | null
          company_subtitle?: string | null
          created_at?: string | null
          heading_font?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          sidebar_bg_color?: string | null
          sidebar_identity_enabled?: boolean | null
          sidebar_identity_font?: string | null
          sidebar_primary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          sync_channel_id: string | null
          sync_expiration: string | null
          sync_resource_id: string | null
          sync_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          sync_channel_id?: string | null
          sync_expiration?: string | null
          sync_resource_id?: string | null
          sync_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          sync_channel_id?: string | null
          sync_expiration?: string | null
          sync_resource_id?: string | null
          sync_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          file_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          embedding?: string | null
          file_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          file_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "knowledge_files"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_files: {
        Row: {
          chunk_count: number
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size?: number
          file_type?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_grouping_queue: {
        Row: {
          contacts_data: Json | null
          created_at: string
          id: string
          instance_id: string | null
          message_data: Json
          message_id: string | null
          phone_number_id: string
          process_after: string | null
          processed: boolean
          whatsapp_message_id: string
        }
        Insert: {
          contacts_data?: Json | null
          created_at?: string
          id?: string
          instance_id?: string | null
          message_data: Json
          message_id?: string | null
          phone_number_id: string
          process_after?: string | null
          processed?: boolean
          whatsapp_message_id: string
        }
        Update: {
          contacts_data?: Json | null
          created_at?: string
          id?: string
          instance_id?: string | null
          message_data?: Json
          message_id?: string | null
          phone_number_id?: string
          process_after?: string | null
          processed?: boolean
          whatsapp_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_grouping_queue_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_grouping_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_processing_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          phone_number_id: string
          priority: number
          processed_at: string | null
          raw_data: Json
          retry_count: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
          whatsapp_message_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          phone_number_id: string
          priority?: number
          processed_at?: string | null
          raw_data: Json
          retry_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
          whatsapp_message_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          phone_number_id?: string
          priority?: number
          processed_at?: string | null
          raw_data?: Json
          retry_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
          whatsapp_message_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          from_type: Database["public"]["Enums"]["message_from"]
          id: string
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          nina_response_time: number | null
          processed_by_nina: boolean | null
          read_at: string | null
          reply_to_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["message_status"]
          type: Database["public"]["Enums"]["message_type"]
          whatsapp_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          from_type: Database["public"]["Enums"]["message_from"]
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          nina_response_time?: number | null
          processed_by_nina?: boolean | null
          read_at?: string | null
          reply_to_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"]
          type?: Database["public"]["Enums"]["message_type"]
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          from_type?: Database["public"]["Enums"]["message_from"]
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          nina_response_time?: number | null
          processed_by_nina?: boolean | null
          read_at?: string | null
          reply_to_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"]
          type?: Database["public"]["Enums"]["message_type"]
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      nina_processing_queue: {
        Row: {
          contact_id: string
          context_data: Json | null
          conversation_id: string
          created_at: string
          error_message: string | null
          id: string
          message_id: string
          priority: number
          processed_at: string | null
          retry_count: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
        }
        Insert: {
          contact_id: string
          context_data?: Json | null
          conversation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_id: string
          priority?: number
          processed_at?: string | null
          retry_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Update: {
          contact_id?: string
          context_data?: Json | null
          conversation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string
          priority?: number
          processed_at?: string | null
          retry_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Relationships: []
      }
      nina_settings: {
        Row: {
          adaptive_response_enabled: boolean
          ai_model_mode: string | null
          ai_scheduling_enabled: boolean | null
          async_booking_enabled: boolean | null
          audio_response_enabled: boolean | null
          auto_response_enabled: boolean
          business_days: number[]
          business_hours_enabled: boolean
          business_hours_end: string
          business_hours_start: string
          company_name: string | null
          created_at: string
          custom_ai_api_key: string | null
          custom_ai_provider: string | null
          elevenlabs_api_key: string | null
          elevenlabs_model: string | null
          elevenlabs_similarity_boost: number
          elevenlabs_speaker_boost: boolean
          elevenlabs_speed: number | null
          elevenlabs_stability: number
          elevenlabs_style: number
          elevenlabs_voice_id: string
          id: string
          is_active: boolean
          message_breaking_enabled: boolean
          out_of_hours_message: string | null
          response_delay_max: number
          response_delay_min: number
          route_all_to_receiver_enabled: boolean
          sdr_name: string | null
          system_prompt_override: string | null
          test_phone_numbers: Json | null
          test_system_prompt: string | null
          timezone: string
          uazapi_base_url: string | null
          uazapi_token: string | null
          updated_at: string
          user_id: string | null
          whatsapp_access_token: string | null
          whatsapp_business_account_id: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_verify_token: string | null
        }
        Insert: {
          adaptive_response_enabled?: boolean
          ai_model_mode?: string | null
          ai_scheduling_enabled?: boolean | null
          async_booking_enabled?: boolean | null
          audio_response_enabled?: boolean | null
          auto_response_enabled?: boolean
          business_days?: number[]
          business_hours_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          company_name?: string | null
          created_at?: string
          custom_ai_api_key?: string | null
          custom_ai_provider?: string | null
          elevenlabs_api_key?: string | null
          elevenlabs_model?: string | null
          elevenlabs_similarity_boost?: number
          elevenlabs_speaker_boost?: boolean
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number
          elevenlabs_style?: number
          elevenlabs_voice_id?: string
          id?: string
          is_active?: boolean
          message_breaking_enabled?: boolean
          out_of_hours_message?: string | null
          response_delay_max?: number
          response_delay_min?: number
          route_all_to_receiver_enabled?: boolean
          sdr_name?: string | null
          system_prompt_override?: string | null
          test_phone_numbers?: Json | null
          test_system_prompt?: string | null
          timezone?: string
          uazapi_base_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_verify_token?: string | null
        }
        Update: {
          adaptive_response_enabled?: boolean
          ai_model_mode?: string | null
          ai_scheduling_enabled?: boolean | null
          async_booking_enabled?: boolean | null
          audio_response_enabled?: boolean | null
          auto_response_enabled?: boolean
          business_days?: number[]
          business_hours_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          company_name?: string | null
          created_at?: string
          custom_ai_api_key?: string | null
          custom_ai_provider?: string | null
          elevenlabs_api_key?: string | null
          elevenlabs_model?: string | null
          elevenlabs_similarity_boost?: number
          elevenlabs_speaker_boost?: boolean
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number
          elevenlabs_style?: number
          elevenlabs_voice_id?: string
          id?: string
          is_active?: boolean
          message_breaking_enabled?: boolean
          out_of_hours_message?: string | null
          response_delay_max?: number
          response_delay_min?: number
          route_all_to_receiver_enabled?: boolean
          sdr_name?: string | null
          system_prompt_override?: string | null
          test_phone_numbers?: Json | null
          test_system_prompt?: string | null
          timezone?: string
          uazapi_base_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_verify_token?: string | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          ai_trigger_criteria: string | null
          color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_ai_managed: boolean | null
          is_system: boolean | null
          position: number
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_trigger_criteria?: string | null
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_ai_managed?: boolean | null
          is_system?: boolean | null
          position?: number
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_trigger_criteria?: string | null
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_ai_managed?: boolean | null
          is_system?: boolean | null
          position?: number
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          has_logged_in: boolean
          id: string
          must_change_password: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_logged_in?: boolean
          id?: string
          must_change_password?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_logged_in?: boolean
          id?: string
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      round_robin_state: {
        Row: {
          created_at: string | null
          function_id: string
          id: string
          last_assigned_at: string | null
          last_assigned_member_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          function_id: string
          id?: string
          last_assigned_at?: string | null
          last_assigned_member_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          function_id?: string
          id?: string
          last_assigned_at?: string | null
          last_assigned_member_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_robin_state_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: true
            referencedRelation: "team_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_robin_state_last_assigned_member_id_fkey"
            columns: ["last_assigned_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      send_queue: {
        Row: {
          contact_id: string
          content: string | null
          conversation_id: string
          created_at: string
          error_message: string | null
          from_type: string
          id: string
          instance_id: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          priority: number
          retry_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
        }
        Insert: {
          contact_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          error_message?: string | null
          from_type?: string
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          priority?: number
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Update: {
          contact_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          error_message?: string | null
          from_type?: string
          id?: string
          instance_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          priority?: number
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_queue_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          agent_enabled: boolean
          created_at: string
          id: string
          registration_enabled: boolean
          updated_at: string
        }
        Insert: {
          agent_enabled?: boolean
          created_at?: string
          id?: string
          registration_enabled?: boolean
          updated_at?: string
        }
        Update: {
          agent_enabled?: boolean
          created_at?: string
          id?: string
          registration_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tag_definitions: {
        Row: {
          category: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_functions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          function_id: string | null
          id: string
          last_active: string | null
          name: string
          phone: string | null
          receives_meetings: boolean | null
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          team_id: string | null
          updated_at: string
          user_id: string | null
          weight: number | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          function_id?: string | null
          id?: string
          last_active?: string | null
          name: string
          phone?: string | null
          receives_meetings?: boolean | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          function_id?: string | null
          id?: string
          last_active?: string | null
          name?: string
          phone?: string | null
          receives_meetings?: boolean | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "team_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instance_secrets: {
        Row: {
          base_url: string
          created_at: string
          id: string
          instance_id: string
          instance_token: string | null
          token: string
          updated_at: string
          verify_token: string | null
        }
        Insert: {
          base_url: string
          created_at?: string
          id?: string
          instance_id: string
          instance_token?: string | null
          token: string
          updated_at?: string
          verify_token?: string | null
        }
        Update: {
          base_url?: string
          created_at?: string
          id?: string
          instance_id?: string
          instance_token?: string | null
          token?: string
          updated_at?: string
          verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instance_secrets_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          instance_id_external: string | null
          instance_name: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          name: string
          phone_number: string | null
          provider_type: Database["public"]["Enums"]["whatsapp_provider_type"]
          qr_code: string | null
          reply_to_groups: boolean
          status: Database["public"]["Enums"]["whatsapp_instance_status"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id_external?: string | null
          instance_name: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name: string
          phone_number?: string | null
          provider_type?: Database["public"]["Enums"]["whatsapp_provider_type"]
          qr_code?: string | null
          reply_to_groups?: boolean
          status?:
            | Database["public"]["Enums"]["whatsapp_instance_status"]
            | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instance_id_external?: string | null
          instance_name?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          phone_number?: string | null
          provider_type?: Database["public"]["Enums"]["whatsapp_provider_type"]
          qr_code?: string | null
          reply_to_groups?: boolean
          status?:
            | Database["public"]["Enums"]["whatsapp_instance_status"]
            | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      contacts_with_stats: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          call_name: string | null
          client_memory: Json | null
          created_at: string | null
          email: string | null
          first_contact_date: string | null
          human_messages: number | null
          id: string | null
          is_blocked: boolean | null
          is_business: boolean | null
          last_activity: string | null
          name: string | null
          nina_messages: number | null
          notes: string | null
          phone_number: string | null
          profile_picture_url: string | null
          tags: string[] | null
          total_messages: number | null
          updated_at: string | null
          user_id: string | null
          user_messages: number | null
          whatsapp_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_message_processing_batch: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          error_message: string | null
          id: string
          phone_number_id: string
          priority: number
          processed_at: string | null
          raw_data: Json
          retry_count: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
          whatsapp_message_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "message_processing_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_nina_processing_batch: {
        Args: { p_limit?: number }
        Returns: {
          contact_id: string
          context_data: Json | null
          conversation_id: string
          created_at: string
          error_message: string | null
          id: string
          message_id: string
          priority: number
          processed_at: string | null
          retry_count: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "nina_processing_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_send_queue_batch: {
        Args: { p_limit?: number }
        Returns: {
          contact_id: string
          content: string | null
          conversation_id: string
          created_at: string
          error_message: string | null
          from_type: string
          id: string
          instance_id: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          priority: number
          retry_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["queue_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "send_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_processed_message_queue: { Args: never; Returns: undefined }
      cleanup_processed_queues: { Args: never; Returns: undefined }
      get_auth_user_id: { Args: never; Returns: string }
      get_next_closer: {
        Args: never
        Returns: {
          member_email: string
          member_id: string
          member_name: string
          member_phone: string
        }[]
      }
      get_or_create_conversation_state: {
        Args: { p_conversation_id: string }
        Returns: {
          conversation_id: string
          created_at: string
          current_state: string
          id: string
          last_action: string | null
          last_action_at: string | null
          scheduling_context: Json | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversation_states"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_knowledge_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          file_id: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      update_client_memory: {
        Args: { p_contact_id: string; p_new_memory: Json }
        Returns: undefined
      }
      update_conversation_state: {
        Args: {
          p_action?: string
          p_context?: Json
          p_conversation_id: string
          p_new_state: string
        }
        Returns: {
          conversation_id: string
          created_at: string
          current_state: string
          id: string
          last_action: string | null
          last_action_at: string | null
          scheduling_context: Json | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversation_states"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
      appointment_type: "demo" | "meeting" | "support" | "followup"
      conversation_status: "nina" | "human" | "paused"
      member_role: "admin" | "manager" | "agent"
      member_status: "active" | "invited" | "disabled"
      message_from: "user" | "nina" | "human"
      message_status: "sent" | "delivered" | "read" | "failed" | "processing"
      message_type: "text" | "audio" | "image" | "document" | "video"
      queue_status: "pending" | "processing" | "completed" | "failed"
      team_assignment: "mateus" | "igor" | "fe" | "vendas" | "suporte"
      whatsapp_instance_status:
        | "connected"
        | "connecting"
        | "disconnected"
        | "qr_required"
      whatsapp_provider_type: "official" | "uazapi"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      appointment_type: ["demo", "meeting", "support", "followup"],
      conversation_status: ["nina", "human", "paused"],
      member_role: ["admin", "manager", "agent"],
      member_status: ["active", "invited", "disabled"],
      message_from: ["user", "nina", "human"],
      message_status: ["sent", "delivered", "read", "failed", "processing"],
      message_type: ["text", "audio", "image", "document", "video"],
      queue_status: ["pending", "processing", "completed", "failed"],
      team_assignment: ["mateus", "igor", "fe", "vendas", "suporte"],
      whatsapp_instance_status: [
        "connected",
        "connecting",
        "disconnected",
        "qr_required",
      ],
      whatsapp_provider_type: ["official", "uazapi"],
    },
  },
} as const
