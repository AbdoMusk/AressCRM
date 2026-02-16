/**
 * Supabase Database Types
 *
 * This file will be replaced by auto-generated types from:
 *   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
 *
 * For now, we define the shape manually to unblock development.
 * Each table must include a `Relationships` array for supabase-js v2.95+.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          action: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          action: string;
          description?: string | null;
        };
        Update: {
          action?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          website: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          assigned_to: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry?: string | null;
          website?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          assigned_to?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          industry?: string | null;
          website?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          assigned_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companies_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "companies_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
          role?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_statuses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string;
          position: number;
          is_win: boolean;
          is_loss: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          color?: string;
          position: number;
          is_win?: boolean;
          is_loss?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          color?: string;
          position?: number;
          is_win?: boolean;
          is_loss?: boolean;
        };
        Relationships: [];
      };
      lead_sources: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          position: number;
        };
        Update: {
          name?: string;
          slug?: string;
          icon?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          company_id: string | null;
          source_id: string;
          status_id: string;
          notes: string | null;
          assigned_to: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          company_id?: string | null;
          source_id: string;
          status_id: string;
          notes?: string | null;
          assigned_to?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          company_id?: string | null;
          source_id?: string;
          status_id?: string;
          notes?: string | null;
          assigned_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_source_id_fkey";
            columns: ["source_id"];
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_status_id_fkey";
            columns: ["status_id"];
            referencedRelation: "lead_statuses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          category: string;
          entity_type: string | null;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          category?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
        };
        Update: {
          action?: string;
          category?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      leads_count_by_status: {
        Args: Record<string, never>;
        Returns: {
          status_id: string;
          name: string;
          slug: string;
          color: string;
          is_win: boolean;
          is_loss: boolean;
          count: number;
        }[];
      };
      leads_monthly_evolution: {
        Args: Record<string, never>;
        Returns: {
          month: string;
          count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}
