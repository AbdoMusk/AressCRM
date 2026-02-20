/**
 * Supabase Database Types — OMP Engine (Object-Module-Processor)
 *
 * Defines the type shape for the Object-Module-Processor schema.
 * Each table includes Row, Insert, Update, and Relationships for supabase-js v2.95+.
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
        Insert: { id: string; full_name: string; avatar_url?: string | null };
        Update: { full_name?: string; avatar_url?: string | null };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: { id?: string; name: string; description?: string | null };
        Update: { name?: string; description?: string | null };
        Relationships: [];
      };
      permissions: {
        Row: { id: string; action: string; description: string | null };
        Insert: { id?: string; action: string; description?: string | null };
        Update: { action?: string; description?: string | null };
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: { role_id?: string; permission_id?: string };
        Relationships: [];
      };
      user_roles: {
        Row: { user_id: string; role_id: string };
        Insert: { user_id: string; role_id: string };
        Update: { user_id?: string; role_id?: string };
        Relationships: [];
      };
      // ── OMP Engine Tables ──────────────────────
      modules: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          icon: string | null;
          schema: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          icon?: string | null;
          schema: Json;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          display_name?: string;
          description?: string | null;
          icon?: string | null;
          schema?: Json;
          is_active?: boolean;
        };
        Relationships: [];
      };
      object_types: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          display_name?: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      object_type_modules: {
        Row: {
          object_type_id: string;
          module_id: string;
          required: boolean;
          position: number;
        };
        Insert: {
          object_type_id: string;
          module_id: string;
          required?: boolean;
          position?: number;
        };
        Update: {
          required?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          id: string;
          object_type_id: string;
          owner_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          object_type_id: string;
          owner_id?: string | null;
          created_by: string;
        };
        Update: {
          object_type_id?: string;
          owner_id?: string | null;
        };
        Relationships: [];
      };
      object_modules: {
        Row: {
          id: string;
          object_id: string;
          module_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          object_id: string;
          module_id: string;
          data?: Json;
        };
        Update: {
          data?: Json;
        };
        Relationships: [];
      };
      object_relations: {
        Row: {
          id: string;
          from_object_id: string;
          to_object_id: string;
          relation_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_object_id: string;
          to_object_id: string;
          relation_type: string;
          metadata?: Json;
        };
        Update: {
          relation_type?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      object_type_relations: {
        Row: {
          id: string;
          source_type_id: string;
          target_type_id: string;
          relation_type: string;
          source_field_name: string;
          target_field_name: string;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_type_id: string;
          target_type_id: string;
          relation_type: string;
          source_field_name: string;
          target_field_name: string;
          is_active?: boolean;
          metadata?: Json;
        };
        Update: {
          relation_type?: string;
          source_field_name?: string;
          target_field_name?: string;
          is_active?: boolean;
          metadata?: Json;
        };
        Relationships: [];
      };
      role_module_permissions: {
        Row: {
          id: string;
          role_id: string;
          module_id: string | null;
          object_type_id: string | null;
          can_read: boolean;
          can_write: boolean;
          can_delete: boolean;
        };
        Insert: {
          id?: string;
          role_id: string;
          module_id?: string | null;
          object_type_id?: string | null;
          can_read?: boolean;
          can_write?: boolean;
          can_delete?: boolean;
        };
        Update: {
          can_read?: boolean;
          can_write?: boolean;
          can_delete?: boolean;
        };
        Relationships: [];
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
        Update: { action?: string; category?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      count_objects_by_type: {
        Args: Record<string, never>;
        Returns: {
          object_type_id: string;
          type_name: string;
          display_name: string;
          icon: string;
          color: string;
          count: number;
        }[];
      };
      aggregate_module_field: {
        Args: {
          p_module_name: string;
          p_field_key: string;
          p_agg_type?: string;
        };
        Returns: number;
      };
      count_by_module_field: {
        Args: {
          p_module_name: string;
          p_field_key: string;
        };
        Returns: {
          field_value: string;
          count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}
