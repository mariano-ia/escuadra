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
      albums: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          kind: string
          name: string
          obra_id: string
          sort_order: number
          studio_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          kind?: string
          name: string
          obra_id: string
          sort_order?: number
          studio_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          kind?: string
          name?: string
          obra_id?: string
          sort_order?: number
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          due_at: string | null
          generated_at: string
          id: string
          kind: string
          message: string
          obra_id: string | null
          severity: string | null
          status: string
          studio_id: string
        }
        Insert: {
          due_at?: string | null
          generated_at?: string
          id?: string
          kind: string
          message: string
          obra_id?: string | null
          severity?: string | null
          status?: string
          studio_id: string
        }
        Update: {
          due_at?: string | null
          generated_at?: string
          id?: string
          kind?: string
          message?: string
          obra_id?: string | null
          severity?: string | null
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          client_id: string | null
          id: string
          obra_id: string
          requested_at: string | null
          resolved_at: string | null
          status: string
          studio_id: string
          subject: string | null
          timeline_entry_id: string | null
        }
        Insert: {
          client_id?: string | null
          id?: string
          obra_id: string
          requested_at?: string | null
          resolved_at?: string | null
          status?: string
          studio_id: string
          subject?: string | null
          timeline_entry_id?: string | null
        }
        Update: {
          client_id?: string | null
          id?: string
          obra_id?: string
          requested_at?: string | null
          resolved_at?: string | null
          status?: string
          studio_id?: string
          subject?: string | null
          timeline_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_timeline_entry_id_fkey"
            columns: ["timeline_entry_id"]
            isOneToOne: false
            referencedRelation: "timeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          studio_id: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          studio_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          studio_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          obra_id: string | null
          related_payment_id: string | null
          related_quote_id: string | null
          scope: string
          starts_at: string
          studio_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          obra_id?: string | null
          related_payment_id?: string | null
          related_quote_id?: string | null
          scope?: string
          starts_at: string
          studio_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          obra_id?: string | null
          related_payment_id?: string | null
          related_quote_id?: string | null
          scope?: string
          starts_at?: string
          studio_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_payment_id_fkey"
            columns: ["related_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          obra_id: string | null
          phone_e164: string | null
          studio_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          obra_id?: string | null
          phone_e164?: string | null
          studio_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          obra_id?: string | null
          phone_e164?: string | null
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_sync_connections: {
        Row: {
          access_token_enc: string | null
          connected_by: string | null
          created_at: string
          id: string
          provider: string
          refresh_token_enc: string | null
          root_folder_id: string | null
          status: string
          studio_id: string
        }
        Insert: {
          access_token_enc?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          provider: string
          refresh_token_enc?: string | null
          root_folder_id?: string | null
          status?: string
          studio_id: string
        }
        Update: {
          access_token_enc?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token_enc?: string | null
          root_folder_id?: string | null
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_sync_connections_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_sync_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          photo_id: string | null
          provider: string
          status: string
          studio_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          photo_id?: string | null
          provider: string
          status?: string
          studio_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          photo_id?: string | null
          provider?: string
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_sync_jobs_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_sync_jobs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          search_vector: unknown
          studio_id: string
          timeline_entry_id: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          search_vector?: unknown
          studio_id: string
          timeline_entry_id?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          search_vector?: unknown
          studio_id?: string
          timeline_entry_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_timeline_entry_id_fkey"
            columns: ["timeline_entry_id"]
            isOneToOne: false
            referencedRelation: "timeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_state: {
        Row: {
          active_obra_id: string | null
          active_obra_set_at: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_reconfirm_at: string | null
          studio_id: string
          user_id: string
        }
        Insert: {
          active_obra_id?: string | null
          active_obra_set_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_reconfirm_at?: string | null
          studio_id: string
          user_id: string
        }
        Update: {
          active_obra_id?: string | null
          active_obra_set_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_reconfirm_at?: string | null
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_state_active_obra_id_fkey"
            columns: ["active_obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_state_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_groups: {
        Row: {
          album_id: string | null
          caption: string | null
          closed_at: string | null
          id: string
          obra_id: string | null
          opened_at: string
          status: string
          studio_id: string
          user_id: string | null
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          closed_at?: string | null
          id?: string
          obra_id?: string | null
          opened_at?: string
          status?: string
          studio_id: string
          user_id?: string | null
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          closed_at?: string | null
          id?: string
          obra_id?: string | null
          opened_at?: string
          status?: string
          studio_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_groups_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_groups_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_groups_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          created_at: string
          event: string
          id: number
          props: Json
          studio_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: never
          props?: Json
          studio_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: never
          props?: Json
          studio_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_log_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_messages: {
        Row: {
          body: string | null
          from_phone: string | null
          id: string
          num_media: number | null
          raw: Json | null
          received_at: string
          studio_id: string | null
          twilio_sid: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          from_phone?: string | null
          id?: string
          num_media?: number | null
          raw?: Json | null
          received_at?: string
          studio_id?: string | null
          twilio_sid: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          from_phone?: string | null
          id?: string
          num_media?: number | null
          raw?: Json | null
          received_at?: string
          studio_id?: string | null
          twilio_sid?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_messages_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          obra_id: string
          provider_id: string | null
          severity: string | null
          status: string
          studio_id: string
          timeline_entry_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          obra_id: string
          provider_id?: string | null
          severity?: string | null
          status?: string
          studio_id: string
          timeline_entry_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          obra_id?: string
          provider_id?: string | null
          severity?: string | null
          status?: string
          studio_id?: string
          timeline_entry_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_timeline_entry_id_fkey"
            columns: ["timeline_entry_id"]
            isOneToOne: false
            referencedRelation: "timeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bytes: number | null
          content_hash: string | null
          created_at: string
          id: string
          kind: string
          mime: string | null
          search_vector: unknown
          storage_path: string
          studio_id: string
          timeline_entry_id: string | null
          transcript: string | null
          transcript_lang: string | null
        }
        Insert: {
          bytes?: number | null
          content_hash?: string | null
          created_at?: string
          id?: string
          kind: string
          mime?: string | null
          search_vector?: unknown
          storage_path: string
          studio_id: string
          timeline_entry_id?: string | null
          transcript?: string | null
          transcript_lang?: string | null
        }
        Update: {
          bytes?: number | null
          content_hash?: string | null
          created_at?: string
          id?: string
          kind?: string
          mime?: string | null
          search_vector?: unknown
          storage_path?: string
          studio_id?: string
          timeline_entry_id?: string | null
          transcript?: string | null
          transcript_lang?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_timeline_entry_id_fkey"
            columns: ["timeline_entry_id"]
            isOneToOne: false
            referencedRelation: "timeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          address: string | null
          client_name: string | null
          client_phone: string | null
          cover_photo_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_inbox: boolean
          name: string
          search_vector: unknown
          status: string
          studio_id: string
        }
        Insert: {
          address?: string | null
          client_name?: string | null
          client_phone?: string | null
          cover_photo_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_inbox?: boolean
          name: string
          search_vector?: unknown
          status?: string
          studio_id: string
        }
        Update: {
          address?: string | null
          client_name?: string | null
          client_phone?: string | null
          cover_photo_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_inbox?: boolean
          name?: string
          search_vector?: unknown
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_codes: {
        Row: {
          attempts: number
          code: string
          consumed_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          studio_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          studio_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          consumed_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_codes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          obra_id: string
          paid_at: string | null
          provider_id: string | null
          status: string
          studio_id: string
          timeline_entry_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          obra_id: string
          paid_at?: string | null
          provider_id?: string | null
          status?: string
          studio_id: string
          timeline_entry_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          obra_id?: string
          paid_at?: string | null
          provider_id?: string | null
          status?: string
          studio_id?: string
          timeline_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_timeline_entry_id_fkey"
            columns: ["timeline_entry_id"]
            isOneToOne: false
            referencedRelation: "timeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_clarifications: {
        Row: {
          candidate_obras: Json
          created_at: string
          entry_group_id: string | null
          expires_at: string
          id: string
          options: Json
          partial_extraction: Json
          question: string
          reminded: boolean
          status: string
          studio_id: string
          user_id: string
        }
        Insert: {
          candidate_obras?: Json
          created_at?: string
          entry_group_id?: string | null
          expires_at: string
          id?: string
          options?: Json
          partial_extraction?: Json
          question: string
          reminded?: boolean
          status?: string
          studio_id: string
          user_id: string
        }
        Update: {
          candidate_obras?: Json
          created_at?: string
          entry_group_id?: string | null
          expires_at?: string
          id?: string
          options?: Json
          partial_extraction?: Json
          question?: string
          reminded?: boolean
          status?: string
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_clarifications_entry_group_id_fkey"
            columns: ["entry_group_id"]
            isOneToOne: false
            referencedRelation: "entry_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_clarifications_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          album_id: string | null
          caption: string | null
          created_at: string
          created_by_user_id: string | null
          height: number | null
          id: string
          obra_id: string
          search_vector: unknown
          storage_path: string
          studio_id: string
          taken_at: string | null
          timeline_entry_id: string | null
          width: number | null
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          created_at?: string
          created_by_user_id?: string | null
          height?: number | null
          id?: string
          obra_id: string
          search_vector?: unknown
          storage_path: string
          studio_id: string
          taken_at?: string | null
          timeline_entry_id?: string | null
          width?: number | null
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          created_at?: string
          created_by_user_id?: string | null
          height?: number | null
          id?: string
          obra_id?: string
          search_vector?: unknown
          storage_path?: string
          studio_id?: string
          taken_at?: string | null
          timeline_entry_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_timeline_entry_id_fkey"
            columns: ["timeline_entry_id"]
            isOneToOne: false
            referencedRelation: "timeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          features: Json
          id: string
          max_obras: number | null
          max_storage_mb: number | null
          max_users: number | null
          name: string
          price_monthly: number
        }
        Insert: {
          features?: Json
          id: string
          max_obras?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number
        }
        Update: {
          features?: Json
          id?: string
          max_obras?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          inbound_message_id: string | null
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          next_attempt_at: string | null
          status: string
          studio_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          inbound_message_id?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          status?: string
          studio_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          inbound_message_id?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          status?: string
          studio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_inbound_message_id_fkey"
            columns: ["inbound_message_id"]
            isOneToOne: false
            referencedRelation: "inbound_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_jobs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      provider_obra_associations: {
        Row: {
          alias: string | null
          id: string
          obra_id: string
          provider_id: string | null
          studio_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          alias?: string | null
          id?: string
          obra_id: string
          provider_id?: string | null
          studio_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          alias?: string | null
          id?: string
          obra_id?: string
          provider_id?: string | null
          studio_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_obra_associations_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_obra_associations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_obra_associations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          created_at: string
          id: string
          is_provisional: boolean
          name: string
          notes: string | null
          phone_e164: string | null
          search_vector: unknown
          studio_id: string
          trade: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_provisional?: boolean
          name: string
          notes?: string | null
          phone_e164?: string | null
          search_vector?: unknown
          studio_id: string
          trade?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_provisional?: boolean
          name?: string
          notes?: string | null
          phone_e164?: string | null
          search_vector?: unknown
          studio_id?: string
          trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          description: string | null
          file_media_asset_id: string | null
          id: string
          needs_review: boolean
          obra_id: string
          provider_id: string | null
          status: string
          studio_id: string
          timeline_entry_id: string | null
          valid_until: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          file_media_asset_id?: string | null
          id?: string
          needs_review?: boolean
          obra_id: string
          provider_id?: string | null
          status?: string
          studio_id: string
          timeline_entry_id?: string | null
          valid_until?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          file_media_asset_id?: string | null
          id?: string
          needs_review?: boolean
          obra_id?: string
          provider_id?: string | null
          status?: string
          studio_id?: string
          timeline_entry_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_file_media_asset_id_fkey"
            columns: ["file_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_timeline_entry_id_fkey"
            columns: ["timeline_entry_id"]
            isOneToOne: false
            referencedRelation: "timeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket_key: string
          count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      report_photos: {
        Row: {
          id: string
          photo_id: string
          report_id: string
          sort_order: number
          studio_id: string
        }
        Insert: {
          id?: string
          photo_id: string
          report_id: string
          sort_order?: number
          studio_id: string
        }
        Update: {
          id?: string
          photo_id?: string
          report_id?: string
          sort_order?: number
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      report_views: {
        Row: {
          id: string
          report_id: string
          studio_id: string
          viewed_at: string
          viewer_hash: string | null
        }
        Insert: {
          id?: string
          report_id: string
          studio_id: string
          viewed_at?: string
          viewer_hash?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          studio_id?: string
          viewed_at?: string
          viewer_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_views_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_views_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_viewed_at: string | null
          note: string | null
          obra_id: string
          passcode: string | null
          public_token: string
          revoked_at: string | null
          studio_id: string
          title: string | null
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          note?: string | null
          obra_id: string
          passcode?: string | null
          public_token: string
          revoked_at?: string | null
          studio_id: string
          title?: string | null
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          note?: string | null
          obra_id?: string
          passcode?: string | null
          public_token?: string
          revoked_at?: string | null
          studio_id?: string
          title?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: string
          status: string
          studio_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          role?: string
          status?: string
          studio_id: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          studio_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_invites_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          studio_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          studio_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          created_at: string
          id: string
          logo_storage_path: string | null
          name: string
          plan_id: string | null
          settings: Json
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_storage_path?: string | null
          name: string
          plan_id?: string | null
          settings?: Json
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_storage_path?: string | null
          name?: string
          plan_id?: string | null
          settings?: Json
          slug?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "studios_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          external_ref: string | null
          id: string
          plan_id: string | null
          provider: string
          status: string
          studio_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          external_ref?: string | null
          id?: string
          plan_id?: string | null
          provider?: string
          status?: string
          studio_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          external_ref?: string | null
          id?: string
          plan_id?: string | null
          provider?: string
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: true
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_entries: {
        Row: {
          body_text: string | null
          client_id: string | null
          confidence: number | null
          created_at: string
          created_by_user_id: string | null
          entry_group_id: string | null
          id: string
          inbound_message_id: string | null
          needs_review: boolean
          obra_id: string
          occurred_at: string
          provider_id: string | null
          search_vector: unknown
          source: string
          studio_id: string
          type: string
        }
        Insert: {
          body_text?: string | null
          client_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by_user_id?: string | null
          entry_group_id?: string | null
          id?: string
          inbound_message_id?: string | null
          needs_review?: boolean
          obra_id: string
          occurred_at?: string
          provider_id?: string | null
          search_vector?: unknown
          source?: string
          studio_id: string
          type: string
        }
        Update: {
          body_text?: string | null
          client_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by_user_id?: string | null
          entry_group_id?: string | null
          id?: string
          inbound_message_id?: string | null
          needs_review?: boolean
          obra_id?: string
          occurred_at?: string
          provider_id?: string | null
          search_vector?: unknown
          source?: string
          studio_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_entry_group_id_fkey"
            columns: ["entry_group_id"]
            isOneToOne: false
            referencedRelation: "entry_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          id: string
          obras_count: number
          period: string
          storage_mb: number
          studio_id: string
          users_count: number
        }
        Insert: {
          id?: string
          obras_count?: number
          period: string
          storage_mb?: number
          studio_id: string
          users_count?: number
        }
        Update: {
          id?: string
          obras_count?: number
          period?: string
          storage_mb?: number
          studio_id?: string
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_links: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string | null
          phone_e164: string
          status: string
          studio_id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          phone_e164: string
          status?: string
          studio_id: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          phone_e164?: string
          status?: string
          studio_id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_links_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_albums: {
        Args: { p_obra: string; p_studio: string }
        Returns: undefined
      }
      is_studio_member: { Args: { target_studio: string }; Returns: boolean }
      studio_role: { Args: { target_studio: string }; Returns: string }
      universal_search: {
        Args: { q: string; target_studio: string }
        Returns: {
          id: string
          kind: string
          obra_id: string
          occurred_at: string
          rank: number
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
