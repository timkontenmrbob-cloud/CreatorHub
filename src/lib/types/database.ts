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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: { check_user_id: string };
        Returns: boolean;
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
