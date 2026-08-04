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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cycle_stats: {
        Row: {
          completed_cycles: number
          plan_id: string
          user_id: string
        }
        Insert: {
          completed_cycles?: number
          plan_id: string
          user_id?: string
        }
        Update: {
          completed_cycles?: number
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_stats_user_id_plan_id_fkey"
            columns: ["user_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "saved_plans"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      mind_maps: {
        Row: {
          data: Json
          ref_id: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          ref_id: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          data?: Json
          ref_id?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_settings: {
        Row: {
          max_session_minutes: number | null
          min_session_minutes: number | null
          plan_id: string
          study_days: string[]
          user_id: string
          weekly_hours: number
        }
        Insert: {
          max_session_minutes?: number | null
          min_session_minutes?: number | null
          plan_id: string
          study_days?: string[]
          user_id?: string
          weekly_hours?: number
        }
        Update: {
          max_session_minutes?: number | null
          min_session_minutes?: number | null
          plan_id?: string
          study_days?: string[]
          user_id?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_settings_user_id_plan_id_fkey"
            columns: ["user_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "saved_plans"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      saved_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          completed: boolean
          id: string
          order_index: number
          plan_id: string
          studied_seconds: number
          subject_id: string
          target_minutes: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          id: string
          order_index?: number
          plan_id: string
          studied_seconds?: number
          subject_id: string
          target_minutes?: number
          user_id?: string
        }
        Update: {
          completed?: boolean
          id?: string
          order_index?: number
          plan_id?: string
          studied_seconds?: number
          subject_id?: string
          target_minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_plan_id_fkey"
            columns: ["user_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "saved_plans"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      study_logs: {
        Row: {
          duration_seconds: number
          id: string
          plan_id: string | null
          studied_at: string
          subject_id: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number
          id: string
          plan_id?: string | null
          studied_at?: string
          subject_id: string
          user_id?: string
        }
        Update: {
          duration_seconds?: number
          id?: string
          plan_id?: string | null
          studied_at?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subject_topics: {
        Row: {
          created_at: string
          id: string
          name: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          subject_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string
          id: string
          importance: number
          knowledge: number
          max_session_minutes: number | null
          min_session_minutes: number | null
          name: string
          plan_id: string
          position: number
          user_id: string
        }
        Insert: {
          color?: string
          id: string
          importance?: number
          knowledge?: number
          max_session_minutes?: number | null
          min_session_minutes?: number | null
          name: string
          plan_id: string
          position?: number
          user_id?: string
        }
        Update: {
          color?: string
          id?: string
          importance?: number
          knowledge?: number
          max_session_minutes?: number | null
          min_session_minutes?: number | null
          name?: string
          plan_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_user_id_plan_id_fkey"
            columns: ["user_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "saved_plans"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
