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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
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
      commissions: {
        Row: {
          created_at: string
          expert_cut: number
          id: string
          platform_cut: number
          released_at: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string
          expert_cut: number
          id?: string
          platform_cut: number
          released_at?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string
          expert_cut?: number
          id?: string
          platform_cut?: number
          released_at?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
          applications_count: number | null
          budget_max: number | null
          budget_min: number | null
          company_name: string | null
          created_at: string
          currency: string | null
          description: string
          experience_level: string | null
          featured: boolean | null
          id: string
          job_type: string | null
          location: string | null
          required_skills: string[] | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          application_deadline?: string | null
          applications_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          description: string
          experience_level?: string | null
          featured?: boolean | null
          id?: string
          job_type?: string | null
          location?: string | null
          required_skills?: string[] | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          application_deadline?: string | null
          applications_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          experience_level?: string | null
          featured?: boolean | null
          id?: string
          job_type?: string | null
          location?: string | null
          required_skills?: string[] | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
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
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
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
        ]
      }
      payouts: {
        Row: {
          amount: number
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
          amount: number
          bank_details?: Json | null
          created_at?: string
          id?: string
          method: string
          paystack_transfer_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
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
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          average_rating: number | null
          bio: string | null
          connections_count: number | null
          created_at: string
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
          updated_at: string
          user_id: string
          wallet_balance: number | null
        }
        Insert: {
          area?: string | null
          average_rating?: number | null
          bio?: string | null
          connections_count?: number | null
          created_at?: string
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
          updated_at?: string
          user_id: string
          wallet_balance?: number | null
        }
        Update: {
          area?: string | null
          average_rating?: number | null
          bio?: string | null
          connections_count?: number | null
          created_at?: string
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
          updated_at?: string
          user_id?: string
          wallet_balance?: number | null
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
          reward: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          reward: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
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
          id: number
          link: string
          platform: string
          reward: number
          status: string
          task_giver_id: string
          total_slots: number
          type: string
        }
        Insert: {
          created_at?: string
          done_slots?: number
          id?: number
          link: string
          platform: string
          reward: number
          status?: string
          task_giver_id: string
          total_slots: number
          type: string
        }
        Update: {
          created_at?: string
          done_slots?: number
          id?: number
          link?: string
          platform?: string
          reward?: number
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          earner_id: string
          id?: never
          screenshot_url?: string | null
          status?: string
          task_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          earner_id?: string
          id?: never
          screenshot_url?: string | null
          status?: string
          task_id?: number
          updated_at?: string
        }
        Relationships: [
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
          content: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
          views_count: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
          views_count?: number
        }
        Update: {
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
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
      subscriptions: {
        Row: {
          expires_at: string | null
          id: string
          paystack_ref: string | null
          plan: string
          price: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          paystack_ref?: string | null
          plan: string
          price: number
          started_at?: string
          status: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          paystack_ref?: string | null
          plan?: string
          price?: number
          started_at?: string
          status?: string
          user_id?: string
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
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          reference: string | null
          status: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          last_update: string
          user_id: string
        }
        Insert: {
          balance?: number
          last_update?: string
          user_id: string
        }
        Update: {
          balance?: number
          last_update?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          action_name: string
          max_requests?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
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
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      users_are_connected: {
        Args: { user1: string; user2: string }
        Returns: boolean
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
