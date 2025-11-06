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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_stats: {
        Row: {
          active_users: number
          created_at: string
          id: string
          new_signups: number
          pending_applications: number
          stat_date: string
          total_experts: number
          total_jobs: number
          total_posts: number
          total_revenue: number
          total_transactions: number
          total_users: number
          total_wallet_balance: number
          updated_at: string
        }
        Insert: {
          active_users?: number
          created_at?: string
          id?: string
          new_signups?: number
          pending_applications?: number
          stat_date?: string
          total_experts?: number
          total_jobs?: number
          total_posts?: number
          total_revenue?: number
          total_transactions?: number
          total_users?: number
          total_wallet_balance?: number
          updated_at?: string
        }
        Update: {
          active_users?: number
          created_at?: string
          id?: string
          new_signups?: number
          pending_applications?: number
          stat_date?: string
          total_experts?: number
          total_jobs?: number
          total_posts?: number
          total_revenue?: number
          total_transactions?: number
          total_users?: number
          total_wallet_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_wallet: {
        Row: {
          balance: number
          id: number
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: never
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: never
          updated_at?: string
        }
        Relationships: []
      }
      ai_moderation_logs: {
        Row: {
          action_taken: string
          content_flagged: string | null
          created_at: string
          group_id: string | null
          id: string
          message_id: string | null
          severity: string
          user_id: string
          violation_type: string
        }
        Insert: {
          action_taken: string
          content_flagged?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          message_id?: string | null
          severity: string
          user_id: string
          violation_type: string
        }
        Update: {
          action_taken?: string
          content_flagged?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          message_id?: string | null
          severity?: string
          user_id?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_moderation_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_moderation_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      article_submissions: {
        Row: {
          article_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          short_note: string
          status: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_note: string
          status?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_note?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_submissions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          approved_submissions: number
          article_url: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          reward_amount: number
          status: string
          submission_instructions: string | null
          title: string
          total_submissions: number
        }
        Insert: {
          approved_submissions?: number
          article_url: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          reward_amount?: number
          status?: string
          submission_instructions?: string | null
          title: string
          total_submissions?: number
        }
        Update: {
          approved_submissions?: number
          article_url?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reward_amount?: number
          status?: string
          submission_instructions?: string | null
          title?: string
          total_submissions?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string | null
          blocker_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id?: string | null
          blocker_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string | null
          blocker_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      comment_views: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_views_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          requested_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      connection_suggestions: {
        Row: {
          created_at: string | null
          id: string
          score: number | null
          suggested_user_id: string
          suggestion_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          score?: number | null
          suggested_user_id: string
          suggestion_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          score?: number | null
          suggested_user_id?: string
          suggestion_type?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          id: string
          status: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          amount: number
          course_id: string
          created_at: string | null
          id: string
          student_id: string
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string | null
          id?: string
          student_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          completed_lessons: Json | null
          course_id: string
          created_at: string | null
          id: string
          last_accessed_at: string | null
          progress_percentage: number | null
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_lessons?: Json | null
          course_id: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          student_id: string
        }
        Update: {
          completed_at?: string | null
          completed_lessons?: Json | null
          course_id?: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          rating: number
          review_text: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          rating: number
          review_text?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      courses: {
        Row: {
          average_rating: number | null
          certificate_included: boolean | null
          course_category: string | null
          course_urls: Json
          created_at: string | null
          curriculum: Json | null
          description: string
          duration_hours: number | null
          enrollment_count: number | null
          id: string
          instructor_bio: string | null
          instructor_credentials: string | null
          instructor_name: string | null
          language: string | null
          learning_objectives: Json | null
          level: string | null
          lifetime_access: boolean | null
          materials_included: Json | null
          money_back_guarantee: boolean | null
          prerequisites: string | null
          price: number
          review_count: number | null
          status: Database["public"]["Enums"]["course_status"] | null
          subtitle_languages: Json | null
          target_audience: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_rating?: number | null
          certificate_included?: boolean | null
          course_category?: string | null
          course_urls?: Json
          created_at?: string | null
          curriculum?: Json | null
          description: string
          duration_hours?: number | null
          enrollment_count?: number | null
          id?: string
          instructor_bio?: string | null
          instructor_credentials?: string | null
          instructor_name?: string | null
          language?: string | null
          learning_objectives?: Json | null
          level?: string | null
          lifetime_access?: boolean | null
          materials_included?: Json | null
          money_back_guarantee?: boolean | null
          prerequisites?: string | null
          price: number
          review_count?: number | null
          status?: Database["public"]["Enums"]["course_status"] | null
          subtitle_languages?: Json | null
          target_audience?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_rating?: number | null
          certificate_included?: boolean | null
          course_category?: string | null
          course_urls?: Json
          created_at?: string | null
          curriculum?: Json | null
          description?: string
          duration_hours?: number | null
          enrollment_count?: number | null
          id?: string
          instructor_bio?: string | null
          instructor_credentials?: string | null
          instructor_name?: string | null
          language?: string | null
          learning_objectives?: Json | null
          level?: string | null
          lifetime_access?: boolean | null
          materials_included?: Json | null
          money_back_guarantee?: boolean | null
          prerequisites?: string | null
          price?: number
          review_count?: number | null
          status?: Database["public"]["Enums"]["course_status"] | null
          subtitle_languages?: Json | null
          target_audience?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crypto_transactions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          crypto_amount: number
          crypto_currency: string
          error_message: string | null
          exchange_rate: number
          id: string
          naira_amount: number
          nc_amount: number
          status: string
          transaction_type: string
          tx_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          crypto_amount: number
          crypto_currency: string
          error_message?: string | null
          exchange_rate: number
          id?: string
          naira_amount: number
          nc_amount: number
          status?: string
          transaction_type: string
          tx_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          crypto_amount?: number
          crypto_currency?: string
          error_message?: string | null
          exchange_rate?: number
          id?: string
          naira_amount?: number
          nc_amount?: number
          status?: string
          transaction_type?: string
          tx_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      daily_signins: {
        Row: {
          created_at: string
          id: string
          reward_amount: number
          signin_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_amount?: number
          signin_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_amount?: number
          signin_date?: string
          user_id?: string
        }
        Relationships: []
      }
      digital_product_purchases: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          average_rating: number | null
          category: Database["public"]["Enums"]["digital_product_category"]
          compatibility: string | null
          created_at: string | null
          demo_url: string | null
          description: string
          detailed_description: string | null
          download_count: number | null
          features: Json | null
          file_format: string | null
          file_size: string | null
          file_url: string | null
          id: string
          instant_download: boolean | null
          is_verified: boolean | null
          license_type: string | null
          preview_url: string | null
          price: number
          refund_policy: string | null
          requirements: string | null
          review_count: number | null
          status: string | null
          support_included: boolean | null
          title: string
          update_history: Json | null
          updated_at: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          average_rating?: number | null
          category: Database["public"]["Enums"]["digital_product_category"]
          compatibility?: string | null
          created_at?: string | null
          demo_url?: string | null
          description: string
          detailed_description?: string | null
          download_count?: number | null
          features?: Json | null
          file_format?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          instant_download?: boolean | null
          is_verified?: boolean | null
          license_type?: string | null
          preview_url?: string | null
          price: number
          refund_policy?: string | null
          requirements?: string | null
          review_count?: number | null
          status?: string | null
          support_included?: boolean | null
          title: string
          update_history?: Json | null
          updated_at?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          average_rating?: number | null
          category?: Database["public"]["Enums"]["digital_product_category"]
          compatibility?: string | null
          created_at?: string | null
          demo_url?: string | null
          description?: string
          detailed_description?: string | null
          download_count?: number | null
          features?: Json | null
          file_format?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          instant_download?: boolean | null
          is_verified?: boolean | null
          license_type?: string | null
          preview_url?: string | null
          price?: number
          refund_policy?: string | null
          requirements?: string | null
          review_count?: number | null
          status?: string | null
          support_included?: boolean | null
          title?: string
          update_history?: Json | null
          updated_at?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      disputed_chat_snapshots: {
        Row: {
          created_at: string
          id: string
          message_text: string
          safepay_id: string | null
          sender_id: string | null
          snapshot_created_at: string | null
        }
        Insert: {
          created_at: string
          id?: string
          message_text: string
          safepay_id?: string | null
          sender_id?: string | null
          snapshot_created_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          safepay_id?: string | null
          sender_id?: string | null
          snapshot_created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputed_chat_snapshots_safepay_id_fkey"
            columns: ["safepay_id"]
            isOneToOne: false
            referencedRelation: "safepay_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          message: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          message?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          message?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      emergency_requests: {
        Row: {
          admin_notes: string | null
          amount_requested: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          disbursed_at: string | null
          id: string
          reason: string
          status: Database["public"]["Enums"]["emergency_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_requested: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          id?: string
          reason: string
          status?: Database["public"]["Enums"]["emergency_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_requested?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["emergency_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      escrow_payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          expert_id: string
          id: string
          job_id: string
          refunded_at: string | null
          released_at: string | null
          status: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          expert_id: string
          id?: string
          job_id: string
          refunded_at?: string | null
          released_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          expert_id?: string
          id?: string
          job_id?: string
          refunded_at?: string | null
          released_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_applications: {
        Row: {
          admin_feedback: string | null
          email: string
          full_name: string
          id: string
          location_area: string
          location_lga: string
          location_state: string
          phone_number: string
          portfolio_link: string | null
          reviewed_at: string | null
          skill_category: string
          status: string | null
          submitted_at: string
          user_id: string
          work_samples_urls: string[] | null
          years_experience: number
        }
        Insert: {
          admin_feedback?: string | null
          email: string
          full_name: string
          id?: string
          location_area: string
          location_lga: string
          location_state: string
          phone_number: string
          portfolio_link?: string | null
          reviewed_at?: string | null
          skill_category: string
          status?: string | null
          submitted_at?: string
          user_id: string
          work_samples_urls?: string[] | null
          years_experience: number
        }
        Update: {
          admin_feedback?: string | null
          email?: string
          full_name?: string
          id?: string
          location_area?: string
          location_lga?: string
          location_state?: string
          phone_number?: string
          portfolio_link?: string | null
          reviewed_at?: string | null
          skill_category?: string
          status?: string | null
          submitted_at?: string
          user_id?: string
          work_samples_urls?: string[] | null
          years_experience?: number
        }
        Relationships: []
      }
      expert_ratings: {
        Row: {
          comment: string | null
          created_at: string
          expert_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          expert_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          expert_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_ratings_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_suggestions: {
        Row: {
          created_at: string | null
          expert_id: string
          id: string
          score: number | null
          suggestion_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expert_id: string
          id?: string
          score?: number | null
          suggestion_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expert_id?: string
          id?: string
          score?: number | null
          suggestion_type?: string
          user_id?: string
        }
        Relationships: []
      }
      fundraising_contributions: {
        Row: {
          amount: number
          contributor_id: string
          created_at: string | null
          fundraising_id: string
          id: string
        }
        Insert: {
          amount: number
          contributor_id: string
          created_at?: string | null
          fundraising_id: string
          id?: string
        }
        Update: {
          amount?: number
          contributor_id?: string
          created_at?: string | null
          fundraising_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraising_contributions_fundraising_id_fkey"
            columns: ["fundraising_id"]
            isOneToOne: false
            referencedRelation: "fundraisings"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraising_updates: {
        Row: {
          content: string
          created_at: string | null
          fundraising_id: string
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          fundraising_id: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          fundraising_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraising_updates_fundraising_id_fkey"
            columns: ["fundraising_id"]
            isOneToOne: false
            referencedRelation: "fundraisings"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraisings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          backer_count: number | null
          beneficiary_name: string | null
          beneficiary_relationship: string | null
          category: string | null
          created_at: string | null
          deadline: string | null
          description: string
          detailed_story: string | null
          featured_image_url: string | null
          fund_usage_breakdown: Json | null
          funds_held_by_admin: boolean | null
          funds_release_requested: boolean | null
          funds_released_at: string | null
          goal_amount: number
          id: string
          is_verified: boolean | null
          location: string | null
          minimum_contribution: number | null
          raised_amount: number | null
          release_requested_at: string | null
          risks_challenges: string | null
          status: Database["public"]["Enums"]["fundraising_status"] | null
          supporting_documents: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          backer_count?: number | null
          beneficiary_name?: string | null
          beneficiary_relationship?: string | null
          category?: string | null
          created_at?: string | null
          deadline?: string | null
          description: string
          detailed_story?: string | null
          featured_image_url?: string | null
          fund_usage_breakdown?: Json | null
          funds_held_by_admin?: boolean | null
          funds_release_requested?: boolean | null
          funds_released_at?: string | null
          goal_amount: number
          id?: string
          is_verified?: boolean | null
          location?: string | null
          minimum_contribution?: number | null
          raised_amount?: number | null
          release_requested_at?: string | null
          risks_challenges?: string | null
          status?: Database["public"]["Enums"]["fundraising_status"] | null
          supporting_documents?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          backer_count?: number | null
          beneficiary_name?: string | null
          beneficiary_relationship?: string | null
          category?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string
          detailed_story?: string | null
          featured_image_url?: string | null
          fund_usage_breakdown?: Json | null
          funds_held_by_admin?: boolean | null
          funds_release_requested?: boolean | null
          funds_released_at?: string | null
          goal_amount?: number
          id?: string
          is_verified?: boolean | null
          location?: string | null
          minimum_contribution?: number | null
          raised_amount?: number | null
          release_requested_at?: string | null
          risks_challenges?: string | null
          status?: Database["public"]["Enums"]["fundraising_status"] | null
          supporting_documents?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraisings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          game_type: string
          id: string
          points_earned: number | null
          session_data: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          game_type: string
          id?: string
          points_earned?: number | null
          session_data?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          game_type?: string
          id?: string
          points_earned?: number | null
          session_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      group_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          group_id: string
          id: string
          is_active: boolean | null
          location: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          group_id: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          group_id?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_active: boolean
          joined_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          group_id: string
          id: string
          is_pinned: boolean | null
          media_type: string | null
          media_url: string | null
          mentions: string[] | null
          message_type: string | null
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          group_id: string
          id?: string
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          mentions?: string[] | null
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          group_id?: string
          id?: string
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          mentions?: string[] | null
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_poll_votes: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          selected_option: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          selected_option: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          selected_option?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_polls: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          options: Json
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          options: Json
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_suggestions: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          score: number | null
          suggestion_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          score?: number | null
          suggestion_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          score?: number | null
          suggestion_type?: string
          user_id?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          area: string
          category: Database["public"]["Enums"]["group_category"]
          created_at: string
          description: string | null
          group_lead_id: string
          id: string
          is_active: boolean
          lga_name: string
          member_count: number | null
          name: string
          state_name: string
          updated_at: string
        }
        Insert: {
          area: string
          category: Database["public"]["Enums"]["group_category"]
          created_at?: string
          description?: string | null
          group_lead_id: string
          id?: string
          is_active?: boolean
          lga_name: string
          member_count?: number | null
          name: string
          state_name: string
          updated_at?: string
        }
        Update: {
          area?: string
          category?: Database["public"]["Enums"]["group_category"]
          created_at?: string
          description?: string | null
          group_lead_id?: string
          id?: string
          is_active?: boolean
          lga_name?: string
          member_count?: number | null
          name?: string
          state_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          status: string
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          status?: string
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_post_applications: {
        Row: {
          applicant_id: string
          availability_date: string | null
          cover_letter: string | null
          created_at: string
          expected_salary: number | null
          id: string
          job_post_id: string
          notifications_enabled: boolean | null
          portfolio_urls: string[] | null
          resume_url: string | null
          status: string | null
        }
        Insert: {
          applicant_id: string
          availability_date?: string | null
          cover_letter?: string | null
          created_at?: string
          expected_salary?: number | null
          id?: string
          job_post_id: string
          notifications_enabled?: boolean | null
          portfolio_urls?: string[] | null
          resume_url?: string | null
          status?: string | null
        }
        Update: {
          applicant_id?: string
          availability_date?: string | null
          cover_letter?: string | null
          created_at?: string
          expected_salary?: number | null
          id?: string
          job_post_id?: string
          notifications_enabled?: boolean | null
          portfolio_urls?: string[] | null
          resume_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_post_applications_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          application_deadline: string | null
          application_instructions: string | null
          applications_count: number | null
          benefits: Json | null
          budget_max: number | null
          budget_min: number | null
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string | null
          description: string
          experience_level: string | null
          featured: boolean | null
          id: string
          industry: string | null
          is_negotiable: boolean | null
          is_remote: boolean | null
          job_type: string | null
          location: string | null
          qualifications: Json | null
          required_skills: string[] | null
          requirements: string | null
          responsibilities: string | null
          salary_currency: string | null
          salary_period: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
          work_schedule: string | null
        }
        Insert: {
          application_deadline?: string | null
          application_instructions?: string | null
          applications_count?: number | null
          benefits?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          description: string
          experience_level?: string | null
          featured?: boolean | null
          id?: string
          industry?: string | null
          is_negotiable?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          qualifications?: Json | null
          required_skills?: string[] | null
          requirements?: string | null
          responsibilities?: string | null
          salary_currency?: string | null
          salary_period?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
          work_schedule?: string | null
        }
        Update: {
          application_deadline?: string | null
          application_instructions?: string | null
          applications_count?: number | null
          benefits?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          experience_level?: string | null
          featured?: boolean | null
          id?: string
          industry?: string | null
          is_negotiable?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          qualifications?: Json | null
          required_skills?: string[] | null
          requirements?: string | null
          responsibilities?: string | null
          salary_currency?: string | null
          salary_period?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
          work_schedule?: string | null
        }
        Relationships: []
      }
      job_suggestions: {
        Row: {
          created_at: string | null
          expert_id: string
          id: string
          job_id: string
          score: number | null
        }
        Insert: {
          created_at?: string | null
          expert_id: string
          id?: string
          job_id: string
          score?: number | null
        }
        Update: {
          created_at?: string | null
          expert_id?: string
          id?: string
          job_id?: string
          score?: number | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          description: string
          id: string
          job_type: string | null
          location: string | null
          required_skills: string[] | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          description: string
          id?: string
          job_type?: string | null
          location?: string | null
          required_skills?: string[] | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          description?: string
          id?: string
          job_type?: string | null
          location?: string | null
          required_skills?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs_services: {
        Row: {
          applications_count: number | null
          category: string
          created_at: string
          description: string
          id: string
          photo_urls: string[] | null
          price: number
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applications_count?: number | null
          category: string
          created_at?: string
          description: string
          id?: string
          photo_urls?: string[] | null
          price: number
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applications_count?: number | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          photo_urls?: string[] | null
          price?: number
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_deposits: {
        Row: {
          admin_notes: string | null
          amount_approved: number | null
          amount_claimed: number
          created_at: string
          id: string
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          telegram_user_id: string | null
          telegram_username: string | null
          transaction_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_approved?: number | null
          amount_claimed: number
          created_at?: string
          id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_user_id?: string | null
          telegram_username?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_approved?: number | null
          amount_claimed?: number
          created_at?: string
          id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          telegram_user_id?: string | null
          telegram_username?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          read_at: string | null
          reply_to_content: string | null
          reply_to_id: string | null
          reply_to_sender: string | null
          sender_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
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
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_details: Json | null
          created_at: string
          id: string
          method: string
          paystack_transfer_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json | null
          created_at?: string
          id?: string
          method?: string
          paystack_transfer_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json | null
          created_at?: string
          id?: string
          method?: string
          paystack_transfer_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          media_url: string | null
          project_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          project_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          media_url?: string | null
          project_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          highlighted: boolean | null
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          highlighted?: boolean | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          highlighted?: boolean | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          content_type: string
          created_at: string
          id: string
          likes_count: number
          media_urls: string[] | null
          metadata: Json | null
          shares_count: number
          status: string
          title: string | null
          updated_at: string
          user_id: string
          views_count: number
          visibility: string | null
        }
        Insert: {
          comments_count?: number
          content: string
          content_type?: string
          created_at?: string
          id?: string
          likes_count?: number
          media_urls?: string[] | null
          metadata?: Json | null
          shares_count?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          views_count?: number
          visibility?: string | null
        }
        Update: {
          comments_count?: number
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          likes_count?: number
          media_urls?: string[] | null
          metadata?: Json | null
          shares_count?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      predictor_bets: {
        Row: {
          created_at: string
          id: string
          question_id: string
          selected_option: number
          stake_amount: number
          status: string | null
          user_id: string
          winnings: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          selected_option: number
          stake_amount: number
          status?: string | null
          user_id: string
          winnings?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          selected_option?: number
          stake_amount?: number
          status?: string | null
          user_id?: string
          winnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictor_bets_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "predictor_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictor_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      predictor_questions: {
        Row: {
          correct_option: number | null
          created_at: string
          description: string | null
          id: string
          options: Json
          resolved_at: string | null
          stake_amount: number
          status: string | null
          title: string
          total_pool: number | null
        }
        Insert: {
          correct_option?: number | null
          created_at?: string
          description?: string | null
          id?: string
          options: Json
          resolved_at?: string | null
          stake_amount?: number
          status?: string | null
          title: string
          total_pool?: number | null
        }
        Update: {
          correct_option?: number | null
          created_at?: string
          description?: string | null
          id?: string
          options?: Json
          resolved_at?: string | null
          stake_amount?: number
          status?: string | null
          title?: string
          total_pool?: number | null
        }
        Relationships: []
      }
      product_downloads: {
        Row: {
          buyer_id: string
          created_at: string | null
          download_count: number | null
          id: string
          last_downloaded_at: string | null
          product_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          download_count?: number | null
          id?: string
          last_downloaded_at?: string | null
          product_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          download_count?: number | null
          id?: string
          last_downloaded_at?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_downloads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profile_views: {
        Row: {
          created_at: string
          id: string
          profile_user_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_user_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_user_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          average_rating: number | null
          balance_non_withdrawable: number | null
          balance_withdrawable: number
          bio: string | null
          celo_wallet_address: string | null
          connections_count: number | null
          created_at: string
          email_confirmed: boolean | null
          encrypted_wallet: string | null
          expert_verified_at: string | null
          full_name: string | null
          id: string
          is_expert: boolean | null
          lga_name: string | null
          open_to_work: boolean | null
          phone_number: string | null
          profession: string | null
          profile_picture_url: string | null
          rating_count: number | null
          referral_code: string | null
          state_id: string | null
          state_name: string | null
          telegram_user_id: string | null
          telegram_username: string | null
          transaction_pin: string | null
          updated_at: string
          user_id: string
          wallet_balance: number | null
        }
        Insert: {
          area?: string | null
          average_rating?: number | null
          balance_non_withdrawable?: number | null
          balance_withdrawable?: number
          bio?: string | null
          celo_wallet_address?: string | null
          connections_count?: number | null
          created_at?: string
          email_confirmed?: boolean | null
          encrypted_wallet?: string | null
          expert_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_expert?: boolean | null
          lga_name?: string | null
          open_to_work?: boolean | null
          phone_number?: string | null
          profession?: string | null
          profile_picture_url?: string | null
          rating_count?: number | null
          referral_code?: string | null
          state_id?: string | null
          state_name?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          transaction_pin?: string | null
          updated_at?: string
          user_id: string
          wallet_balance?: number | null
        }
        Update: {
          area?: string | null
          average_rating?: number | null
          balance_non_withdrawable?: number | null
          balance_withdrawable?: number
          bio?: string | null
          celo_wallet_address?: string | null
          connections_count?: number | null
          created_at?: string
          email_confirmed?: boolean | null
          encrypted_wallet?: string | null
          expert_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_expert?: boolean | null
          lga_name?: string | null
          open_to_work?: boolean | null
          phone_number?: string | null
          profession?: string | null
          profile_picture_url?: string | null
          rating_count?: number | null
          referral_code?: string | null
          state_id?: string | null
          state_name?: string | null
          telegram_user_id?: string | null
          telegram_username?: string | null
          transaction_pin?: string | null
          updated_at?: string
          user_id?: string
          wallet_balance?: number | null
        }
        Relationships: []
      }
      quidax_transactions: {
        Row: {
          created_at: string
          fiat_amount: number
          fiat_currency: string
          id: string
          quidax_data: Json | null
          reference: string
          status: string
          token: string
          token_amount: number | null
          transaction_type: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          fiat_amount: number
          fiat_currency?: string
          id?: string
          quidax_data?: Json | null
          reference: string
          status?: string
          token?: string
          token_amount?: number | null
          transaction_type: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          fiat_amount?: number
          fiat_currency?: string
          id?: string
          quidax_data?: Json | null
          reference?: string
          status?: string
          token?: string
          token_amount?: number | null
          transaction_type?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          created_at: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          created_at?: string
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          created_at?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_campaigns: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          provider_name: string
          referral_link: string
          reward_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name: string
          referral_link: string
          reward_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          referral_link?: string
          reward_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_submissions: {
        Row: {
          admin_comment: string | null
          created_at: string
          id: string
          proof_url: string | null
          status: string
          task_id: string
          text_explanation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string
          id?: string
          proof_url?: string | null
          status?: string
          task_id: string
          text_explanation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          created_at?: string
          id?: string
          proof_url?: string | null
          status?: string
          task_id?: string
          text_explanation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "referral_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          reward: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          reward: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          reward?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          points_earned: number | null
          proof_url: string | null
          referee_id: string
          referrer_id: string
          reward_earned: number | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          points_earned?: number | null
          proof_url?: string | null
          referee_id: string
          referrer_id: string
          reward_earned?: number | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          points_earned?: number | null
          proof_url?: string | null
          referee_id?: string
          referrer_id?: string
          reward_earned?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referrals_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "referral_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      safepay_actions: {
        Row: {
          action_by: string
          action_type: string
          created_at: string | null
          escrow_id: string
          id: number
          payload: Json | null
        }
        Insert: {
          action_by: string
          action_type: string
          created_at?: string | null
          escrow_id: string
          id?: never
          payload?: Json | null
        }
        Update: {
          action_by?: string
          action_type?: string
          created_at?: string | null
          escrow_id?: string
          id?: never
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "safepay_actions_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      safepay_transactions: {
        Row: {
          admin_ruling: string | null
          amount: number
          auto_release_at: string | null
          buyer_id: string | null
          cancel_approved_by: string | null
          cancel_requester_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          dispute_reason: string | null
          disputed_at: string | null
          expires_at: string | null
          id: string
          released_at: string | null
          seller_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_ruling?: string | null
          amount: number
          auto_release_at?: string | null
          buyer_id?: string | null
          cancel_approved_by?: string | null
          cancel_requester_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          dispute_reason?: string | null
          disputed_at?: string | null
          expires_at?: string | null
          id?: string
          released_at?: string | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_ruling?: string | null
          amount?: number
          auto_release_at?: string | null
          buyer_id?: string | null
          cancel_approved_by?: string | null
          cancel_requester_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          dispute_reason?: string | null
          disputed_at?: string | null
          expires_at?: string | null
          id?: string
          released_at?: string | null
          seller_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safepay_transactions_buyer_fk"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "safepay_transactions_cancel_approver_fk"
            columns: ["cancel_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "safepay_transactions_cancel_requester_fk"
            columns: ["cancel_requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "safepay_transactions_seller_fk"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: string
          job_post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          created_at: string
          endorser_id: string
          id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          endorser_id: string
          id?: string
          skill_id: string
        }
        Update: {
          created_at?: string
          endorser_id?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          skill_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill_name?: string
          user_id?: string
        }
        Relationships: []
      }
      social_tasks: {
        Row: {
          created_at: string
          done_slots: number
          fee_paid: number | null
          id: number
          link: string
          platform: string
          reward: number
          reward_amount: number | null
          status: string
          task_giver_id: string
          total_slots: number
          type: string
        }
        Insert: {
          created_at?: string
          done_slots?: number
          fee_paid?: number | null
          id?: number
          link: string
          platform: string
          reward: number
          reward_amount?: number | null
          status?: string
          task_giver_id: string
          total_slots: number
          type: string
        }
        Update: {
          created_at?: string
          done_slots?: number
          fee_paid?: number | null
          id?: number
          link?: string
          platform?: string
          reward?: number
          reward_amount?: number | null
          status?: string
          task_giver_id?: string
          total_slots?: number
          type?: string
        }
        Relationships: []
      }
      social_tasks_progress: {
        Row: {
          created_at: string
          earner_id: string
          id: number
          screenshot_url: string | null
          status: string
          task_id: number
          text_explanation: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          earner_id: string
          id?: never
          screenshot_url?: string | null
          status?: string
          task_id: number
          text_explanation?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          earner_id?: string
          id?: never
          screenshot_url?: string | null
          status?: string
          task_id?: number
          text_explanation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_tasks_progress_earner_id_fkey"
            columns: ["earner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_tasks_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "social_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          background_color: string | null
          content: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string | null
          privacy_setting: string | null
          user_id: string
          views_count: number
        }
        Insert: {
          background_color?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          privacy_setting?: string | null
          user_id: string
          views_count?: number
        }
        Update: {
          background_color?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          privacy_setting?: string | null
          user_id?: string
          views_count?: number
        }
        Relationships: []
      }
      story_views: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_account: {
        Row: {
          attrs: Json | null
          business_type: string | null
          country: string | null
          created: string | null
          email: string | null
          id: string | null
          type: string | null
        }
        Insert: {
          attrs?: Json | null
          business_type?: string | null
          country?: string | null
          created?: string | null
          email?: string | null
          id?: string | null
          type?: string | null
        }
        Update: {
          attrs?: Json | null
          business_type?: string | null
          country?: string | null
          created?: string | null
          email?: string | null
          id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      survey_completions: {
        Row: {
          bitlabs_user_id: string
          callback_data: Json | null
          completed_at: string | null
          created_at: string
          id: string
          offer_id: string
          points_earned: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          bitlabs_user_id: string
          callback_data?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          offer_id: string
          points_earned?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          bitlabs_user_id?: string
          callback_data?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          offer_id?: string
          points_earned?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          done: boolean | null
          id: number
          title: string
          user_id: string
        }
        Insert: {
          done?: boolean | null
          id?: never
          title: string
          user_id: string
        }
        Update: {
          done?: boolean | null
          id?: never
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_disputes: {
        Row: {
          admin_response: string | null
          created_at: string
          dispute_details: string | null
          dispute_reason: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          dispute_details?: string | null
          dispute_reason: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          dispute_details?: string | null
          dispute_reason?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          amount_nc: number | null
          amount_ngn: number | null
          balance_type: string
          created_at: string
          description: string | null
          fee_nc: number | null
          id: string
          metadata: Json | null
          payment_method: string | null
          recipient_id: string | null
          reference: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          amount_nc?: number | null
          amount_ngn?: number | null
          balance_type: string
          created_at?: string
          description?: string | null
          fee_nc?: number | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          recipient_id?: string | null
          reference?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_nc?: number | null
          amount_ngn?: number | null
          balance_type?: string
          created_at?: string
          description?: string | null
          fee_nc?: number | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          recipient_id?: string | null
          reference?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trivia_questions: {
        Row: {
          category: string | null
          correct_answer: number
          created_at: string
          difficulty: string | null
          id: string
          is_active: boolean | null
          options: Json
          question: string
        }
        Insert: {
          category?: string | null
          correct_answer: number
          created_at?: string
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          options: Json
          question: string
        }
        Update: {
          category?: string | null
          correct_answer?: number
          created_at?: string
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json
          question?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_violations: {
        Row: {
          ban_expires_at: string | null
          group_id: string | null
          id: string
          is_banned: boolean | null
          last_violation_at: string
          user_id: string
          violation_count: number | null
        }
        Insert: {
          ban_expires_at?: string | null
          group_id?: string | null
          id?: string
          is_banned?: boolean | null
          last_violation_at?: string
          user_id: string
          violation_count?: number | null
        }
        Update: {
          ban_expires_at?: string | null
          group_id?: string | null
          id?: string
          is_banned?: boolean | null
          last_violation_at?: string
          user_id?: string
          violation_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_violations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          escrow_hold: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          escrow_hold?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          escrow_hold?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          kind: string
          metadata: Json | null
          reference: string | null
          safepay_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          kind: string
          metadata?: Json | null
          reference?: string | null
          safepay_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          metadata?: Json | null
          reference?: string | null
          safepay_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_safepay_id_fkey"
            columns: ["safepay_id"]
            isOneToOne: false
            referencedRelation: "safepay_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          last_update: string
          pending_balance: number | null
          user_id: string
        }
        Insert: {
          balance?: number
          last_update?: string
          pending_balance?: number | null
          user_id: string
        }
        Update: {
          balance?: number
          last_update?: string
          pending_balance?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_admin_invitation: { Args: { p_token: string }; Returns: Json }
      accept_safepay:
        | { Args: { p_safepay_id: string }; Returns: undefined }
        | {
            Args: { p_acceptor: string; p_escrow_id: string }
            Returns: undefined
          }
      admin_release_fundraising_funds: {
        Args: { p_admin_id: string; p_fundraising_id: string }
        Returns: Json
      }
      auto_release_safepay: { Args: never; Returns: undefined }
      calculate_comment_engagement: {
        Args: { p_comment_id: string }
        Returns: number
      }
      calculate_nc_amount: {
        Args: { amount_ngn: number; payment_method?: string }
        Returns: number
      }
      cancel_safepay_proposal: {
        Args: { p_safepay_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          action_name: string
          max_requests?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      contribute_to_fundraising: {
        Args: {
          p_amount: number
          p_contributor_id: string
          p_fundraising_id: string
        }
        Returns: Json
      }
      file_dispute_safepay: {
        Args: { p_reason: string; p_safepay_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_connected_profile_info: {
        Args: { target_user_id: string }
        Returns: {
          area: string
          bio: string
          connections_count: number
          created_at: string
          expert_verified_at: string
          full_name: string
          id: string
          is_expert: boolean
          lga_name: string
          phone_number: string
          profession: string
          profile_picture_url: string
          state_name: string
          user_id: string
        }[]
      }
      get_public_profile_info: {
        Args: { target_user_id: string }
        Returns: {
          bio: string
          created_at: string
          expert_verified_at: string
          full_name: string
          id: string
          is_expert: boolean
          profession: string
          profile_picture_url: string
          user_id: string
        }[]
      }
      get_system_setting: { Args: { setting_key: string }; Returns: string }
      has_purchased_product: {
        Args: { p_product_id: string; p_user_id: string }
        Returns: boolean
      }
      has_user_role: {
        Args: {
          check_role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: boolean
      }
      increment_wallet_balance: {
        Args: { amount_to_add: number; target_user_id: string }
        Returns: undefined
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_enrolled_in_course: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_lead_check: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_member_check: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      lookup_user_by_email: { Args: { lookup_email: string }; Returns: Json }
      mark_safepay_complete: {
        Args: { p_safepay_id: string }
        Returns: undefined
      }
      propose_safepay: {
        Args: { p_amount: number; p_buyer_id: string; p_seller_id: string }
        Returns: Json
      }
      refresh_admin_stats: { Args: never; Returns: undefined }
      refund_safepay: {
        Args: { p_escrow_id: string; p_requester: string }
        Returns: undefined
      }
      release_safepay: {
        Args: { p_escrow_id: string; p_releaser: string }
        Returns: undefined
      }
      release_safepay_funds: {
        Args: { p_safepay_id: string }
        Returns: undefined
      }
      request_fundraising_release: {
        Args: { p_fundraising_id: string; p_user_id: string }
        Returns: Json
      }
      transfer_funds: {
        Args: {
          amount: number
          pin_hash: string
          recipient_email: string
          sender_id: string
        }
        Returns: Json
      }
      users_are_connected: {
        Args: { user1: string; user2: string }
        Returns: boolean
      }
    }
    Enums: {
      course_status: "draft" | "active" | "inactive"
      digital_product_category:
        | "document"
        | "ebook"
        | "pdf"
        | "template"
        | "audio"
        | "video"
        | "other"
      emergency_status: "pending" | "approved" | "rejected" | "disbursed"
      fundraising_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      group_category:
        | "technology"
        | "business"
        | "healthcare"
        | "education"
        | "agriculture"
        | "construction"
        | "finance"
        | "legal"
        | "creative"
        | "other"
      user_role: "user" | "admin" | "moderator" | "expert"
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
      course_status: ["draft", "active", "inactive"],
      digital_product_category: [
        "document",
        "ebook",
        "pdf",
        "template",
        "audio",
        "video",
        "other",
      ],
      emergency_status: ["pending", "approved", "rejected", "disbursed"],
      fundraising_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      group_category: [
        "technology",
        "business",
        "healthcare",
        "education",
        "agriculture",
        "construction",
        "finance",
        "legal",
        "creative",
        "other",
      ],
      user_role: ["user", "admin", "moderator", "expert"],
    },
  },
} as const
