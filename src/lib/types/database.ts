export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          tiktok_username: string | null;
          instagram_username: string | null;
          whatsapp_number: string | null;
          avatar_url: string | null;
          profile_completed: boolean;
          public_leaderboard_consent?: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          tiktok_username?: string | null;
          instagram_username?: string | null;
          whatsapp_number?: string | null;
          avatar_url?: string | null;
          profile_completed?: boolean;
          public_leaderboard_consent?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          tiktok_username?: string | null;
          instagram_username?: string | null;
          whatsapp_number?: string | null;
          avatar_url?: string | null;
          profile_completed?: boolean;
          public_leaderboard_consent?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_roles: {
        Row: {
          user_id: string;
          role: "admin" | "superadmin";
          created_at: string;
        };
        Insert: {
          user_id: string;
          role?: "admin" | "superadmin";
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: "admin" | "superadmin";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      point_lots: {
        Row: {
          id: string;
          user_id: string;
          source_type: "views" | "bonus" | "adjustment" | "challenge";
          source_id: string | null;
          original_points: number;
          remaining_points: number;
          issued_at: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_type?: "views" | "bonus" | "adjustment" | "challenge";
          source_id?: string | null;
          original_points: number;
          remaining_points: number;
          issued_at?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_type?: "views" | "bonus" | "adjustment" | "challenge";
          source_id?: string | null;
          original_points?: number;
          remaining_points?: number;
          issued_at?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_lots_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      point_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: "earned" | "redeemed" | "expired" | "reversed" | "bonus" | "adjustment";
          amount: number;
          related_point_lot_id: string | null;
          reference_id: string | null;
          idempotency_key: string | null;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: "earned" | "redeemed" | "expired" | "reversed" | "bonus" | "adjustment";
          amount: number;
          related_point_lot_id?: string | null;
          reference_id?: string | null;
          idempotency_key?: string | null;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: "earned" | "redeemed" | "expired" | "reversed" | "bonus" | "adjustment";
          amount?: number;
          related_point_lot_id?: string | null;
          reference_id?: string | null;
          idempotency_key?: string | null;
          description?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_transactions_related_point_lot_id_fkey";
            columns: ["related_point_lot_id"];
            isOneToOne: false;
            referencedRelation: "point_lots";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_drafts: {
        Row: {
          id: string;
          user_id: string;
          platform: "tiktok" | "instagram";
          video_url: string;
          normalized_video_identifier: string | null;
          posting_date: string;
          current_views: number | null;
          estimated_points: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: "tiktok" | "instagram";
          video_url: string;
          normalized_video_identifier?: string | null;
          posting_date: string;
          current_views?: number | null;
          estimated_points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: "tiktok" | "instagram";
          video_url?: string;
          normalized_video_identifier?: string | null;
          posting_date?: string;
          current_views?: number | null;
          estimated_points?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_drafts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          id: string;
          user_id: string;
          platform: "tiktok" | "instagram";
          video_url: string;
          normalized_video_identifier: string;
          posting_date: string;
          submitted_at: string;
          claimed_views: number;
          estimated_points: number;
          verified_views: number | null;
          approved_points: number | null;
          status: "submitted" | "under_review" | "requires_revision" | "approved" | "rejected";
          admin_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          agreement_accepted: boolean;
          agreement_version: string | null;
          agreement_accepted_at: string | null;
          content_category?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: "tiktok" | "instagram";
          video_url: string;
          normalized_video_identifier: string;
          posting_date: string;
          submitted_at?: string;
          claimed_views: number;
          estimated_points: number;
          verified_views?: number | null;
          approved_points?: number | null;
          status?: "submitted" | "under_review" | "requires_revision" | "approved" | "rejected";
          admin_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          agreement_accepted?: boolean;
          agreement_version?: string | null;
          agreement_accepted_at?: string | null;
          content_category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: "tiktok" | "instagram";
          video_url?: string;
          normalized_video_identifier?: string;
          posting_date?: string;
          submitted_at?: string;
          claimed_views?: number;
          estimated_points?: number;
          verified_views?: number | null;
          approved_points?: number | null;
          status?: "submitted" | "under_review" | "requires_revision" | "approved" | "rejected";
          admin_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          agreement_accepted?: boolean;
          agreement_version?: string | null;
          agreement_accepted_at?: string | null;
          content_category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_evidence: {
        Row: {
          id: string;
          submission_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          uploaded_at: string;
          retention_status: "active" | "scheduled_for_deletion" | "deleted" | "disputed";
          scheduled_deletion_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          submission_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          uploaded_at?: string;
          retention_status?: "active" | "scheduled_for_deletion" | "deleted" | "disputed";
          scheduled_deletion_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          submission_id?: string;
          storage_path?: string;
          file_name?: string;
          file_size?: number;
          mime_type?: string;
          uploaded_at?: string;
          retention_status?: "active" | "scheduled_for_deletion" | "deleted" | "disputed";
          scheduled_deletion_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submission_evidence_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_audit_logs: {
        Row: {
          id: string;
          submission_id: string;
          admin_id: string;
          previous_status: string;
          new_status: string;
          verified_views: number | null;
          approved_points: number | null;
          decision_reason: string | null;
          admin_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          admin_id: string;
          previous_status: string;
          new_status: string;
          verified_views?: number | null;
          approved_points?: number | null;
          decision_reason?: string | null;
          admin_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          admin_id?: string;
          previous_status?: string;
          new_status?: string;
          verified_views?: number | null;
          approved_points?: number | null;
          decision_reason?: string | null;
          admin_notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_audit_logs_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      rewards: {
        Row: {
          id: string;
          name: string;
          description: string;
          required_points: number;
          image_path: string;
          reward_type: "merchandise" | "voucher" | "class_program";
          availability: boolean;
          redemption_terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          required_points: number;
          image_path: string;
          reward_type: "merchandise" | "voucher" | "class_program";
          availability?: boolean;
          redemption_terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          required_points?: number;
          image_path?: string;
          reward_type?: "merchandise" | "voucher" | "class_program";
          availability?: boolean;
          redemption_terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      redemptions: {
        Row: {
          id: string;
          creator_id: string;
          reward_id: string;
          required_points_snapshot: number;
          reward_name_snapshot: string;
          status: "pending" | "processing" | "ready" | "completed" | "rejected";
          requested_at: string;
          processed_at: string | null;
          processed_by: string | null;
          fulfillment_notes: string | null;
          rejection_reason: string | null;
          recipient_name: string | null;
          shipping_address: string | null;
          contact_whatsapp: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          reward_id: string;
          required_points_snapshot: number;
          reward_name_snapshot: string;
          status?: "pending" | "processing" | "ready" | "completed" | "rejected";
          requested_at?: string;
          processed_at?: string | null;
          processed_by?: string | null;
          fulfillment_notes?: string | null;
          rejection_reason?: string | null;
          recipient_name?: string | null;
          shipping_address?: string | null;
          contact_whatsapp?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          reward_id?: string;
          required_points_snapshot?: number;
          reward_name_snapshot?: string;
          status?: "pending" | "processing" | "ready" | "completed" | "rejected";
          requested_at?: string;
          processed_at?: string | null;
          processed_by?: string | null;
          fulfillment_notes?: string | null;
          rejection_reason?: string | null;
          recipient_name?: string | null;
          shipping_address?: string | null;
          contact_whatsapp?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "redemptions_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: false;
            referencedRelation: "rewards";
            referencedColumns: ["id"];
          },
        ];
      };
      redemption_allocations: {
        Row: {
          id: string;
          redemption_id: string;
          point_lot_id: string;
          allocated_points: number;
          original_expiration_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          redemption_id: string;
          point_lot_id: string;
          allocated_points: number;
          original_expiration_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          redemption_id?: string;
          point_lot_id?: string;
          allocated_points?: number;
          original_expiration_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "redemption_allocations_redemption_id_fkey";
            columns: ["redemption_id"];
            isOneToOne: false;
            referencedRelation: "redemptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemption_allocations_point_lot_id_fkey";
            columns: ["point_lot_id"];
            isOneToOne: false;
            referencedRelation: "point_lots";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_costs: {
        Row: {
          id: string;
          year: number;
          quarter: "Q1" | "Q2" | "Q3" | "Q4";
          category: "merchandise" | "voucher" | "class_program" | "operational" | "other";
          description: string;
          amount_idr: number;
          expense_date: string;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          quarter: "Q1" | "Q2" | "Q3" | "Q4";
          category: "merchandise" | "voucher" | "class_program" | "operational" | "other";
          description: string;
          amount_idr: number;
          expense_date: string;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          quarter?: "Q1" | "Q2" | "Q3" | "Q4";
          category?: "merchandise" | "voucher" | "class_program" | "operational" | "other";
          description?: string;
          amount_idr?: number;
          expense_date?: string;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quarterly_snapshots: {
        Row: {
          id: string;
          year: number;
          quarter: "Q1" | "Q2" | "Q3" | "Q4";
          version: number;
          status: "draft" | "finalized" | "revised";
          kpi_data: Json;
          platform_data: Json;
          cost_data: Json;
          monthly_data: Json;
          content_data: Json;
          methodology_version: string;
          cutoff_at: string;
          finalized_by: string | null;
          finalized_at: string | null;
          revision_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          quarter: "Q1" | "Q2" | "Q3" | "Q4";
          version?: number;
          status?: "draft" | "finalized" | "revised";
          kpi_data?: Json;
          platform_data?: Json;
          cost_data?: Json;
          monthly_data?: Json;
          content_data?: Json;
          methodology_version?: string;
          cutoff_at?: string;
          finalized_by?: string | null;
          finalized_at?: string | null;
          revision_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          quarter?: "Q1" | "Q2" | "Q3" | "Q4";
          version?: number;
          status?: "draft" | "finalized" | "revised";
          kpi_data?: Json;
          platform_data?: Json;
          cost_data?: Json;
          monthly_data?: Json;
          content_data?: Json;
          methodology_version?: string;
          cutoff_at?: string;
          finalized_by?: string | null;
          finalized_at?: string | null;
          revision_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: { check_user_id: string };
        Returns: boolean;
      };
      get_wallet_summary: {
        Args: { target_user_id: string };
        Returns: Json;
      };
      issue_points_lot: {
        Args: {
          target_user_id: string;
          p_points: number;
          p_source_type?: string;
          p_source_id?: string | null;
          p_description?: string;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      redeem_points_ordered: {
        Args: {
          target_user_id: string;
          p_points: number;
          p_reference_id?: string | null;
          p_description?: string;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      expire_overdue_point_lots: {
        Args: Record<string, never>;
        Returns: Json;
      };
      check_video_submission_eligibility: {
        Args: {
          p_normalized_identifier: string;
          p_posting_date: string;
        };
        Returns: Json;
      };
      approve_submission_and_issue_points: {
        Args: {
          p_submission_id: string;
          p_verified_views: number;
          p_admin_notes?: string | null;
        };
        Returns: Json;
      };
      reject_submission: {
        Args: {
          p_submission_id: string;
          p_rejection_reason: string;
          p_admin_notes?: string | null;
        };
        Returns: Json;
      };
      request_additional_evidence: {
        Args: {
          p_submission_id: string;
          p_request_notes: string;
        };
        Returns: Json;
      };
      get_expired_evidence_for_cleanup: {
        Args: {
          p_limit?: number;
        };
        Returns: Json;
      };
      redeem_reward_atomic: {
        Args: {
          p_creator_id: string;
          p_reward_id: string;
          p_shipping_address?: string | null;
          p_contact_whatsapp?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      admin_process_redemption: {
        Args: {
          p_redemption_id: string;
          p_action: string;
          p_fulfillment_notes?: string | null;
          p_rejection_reason?: string | null;
        };
        Returns: Json;
      };
      get_leaderboard_creators: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_limit?: number;
        };
        Returns: Json;
      };
      get_leaderboard_videos: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_limit?: number;
        };
        Returns: Json;
      };
      get_creator_rank: {
        Args: {
          p_user_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
