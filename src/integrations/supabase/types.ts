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
      companies: {
        Row: {
          address: string | null
          address_label: string | null
          archived: boolean
          assigned_to: string | null
          business_type: string | null
          city: string | null
          company_size: string | null
          country: string | null
          created_at: string
          created_by: string | null
          decision_maker: string | null
          email: string | null
          employees: string | null
          facebook: string | null
          google_maps_url: string | null
          has_automation: boolean | null
          has_crm: boolean | null
          has_erp: boolean | null
          id: string
          industry: string | null
          instagram: string | null
          last_signals: Json | null
          linkedin: string | null
          logo_url: string | null
          main_category: string | null
          marketing_notes: string | null
          missing_info: Json | null
          name: string
          notes: string | null
          phone: string | null
          priority: Database["public"]["Enums"]["company_priority"]
          priority_reason: string | null
          priority_score: number | null
          products: string | null
          raw_notes: string | null
          services: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          sub_category: string | null
          updated_at: string
          updated_by: string | null
          uses_ai: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_label?: string | null
          archived?: boolean
          assigned_to?: string | null
          business_type?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          decision_maker?: string | null
          email?: string | null
          employees?: string | null
          facebook?: string | null
          google_maps_url?: string | null
          has_automation?: boolean | null
          has_crm?: boolean | null
          has_erp?: boolean | null
          id?: string
          industry?: string | null
          instagram?: string | null
          last_signals?: Json | null
          linkedin?: string | null
          logo_url?: string | null
          main_category?: string | null
          marketing_notes?: string | null
          missing_info?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["company_priority"]
          priority_reason?: string | null
          priority_score?: number | null
          products?: string | null
          raw_notes?: string | null
          services?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          sub_category?: string | null
          updated_at?: string
          updated_by?: string | null
          uses_ai?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_label?: string | null
          archived?: boolean
          assigned_to?: string | null
          business_type?: string | null
          city?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          decision_maker?: string | null
          email?: string | null
          employees?: string | null
          facebook?: string | null
          google_maps_url?: string | null
          has_automation?: boolean | null
          has_crm?: boolean | null
          has_erp?: boolean | null
          id?: string
          industry?: string | null
          instagram?: string | null
          last_signals?: Json | null
          linkedin?: string | null
          logo_url?: string | null
          main_category?: string | null
          marketing_notes?: string | null
          missing_info?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["company_priority"]
          priority_reason?: string | null
          priority_score?: number | null
          products?: string | null
          raw_notes?: string | null
          services?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          sub_category?: string | null
          updated_at?: string
          updated_by?: string | null
          uses_ai?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      company_analyses: {
        Row: {
          change_summary: Json | null
          changed_fields: Json | null
          company_id: string
          created_at: string
          created_by: string | null
          data_hash: string | null
          id: string
          language: string
          model: string | null
          partial: boolean
          report: Json
          sections_updated: string[] | null
          version: number
        }
        Insert: {
          change_summary?: Json | null
          changed_fields?: Json | null
          company_id: string
          created_at?: string
          created_by?: string | null
          data_hash?: string | null
          id?: string
          language?: string
          model?: string | null
          partial?: boolean
          report: Json
          sections_updated?: string[] | null
          version?: number
        }
        Update: {
          change_summary?: Json | null
          changed_fields?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          data_hash?: string | null
          id?: string
          language?: string
          model?: string | null
          partial?: boolean
          report?: Json
          sections_updated?: string[] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_analyses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_files: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_snapshots: {
        Row: {
          analyzed: number
          created_at: string
          high: number
          snapshot_date: string
          total: number
          user_id: string
          won: number
        }
        Insert: {
          analyzed?: number
          created_at?: string
          high?: number
          snapshot_date?: string
          total?: number
          user_id: string
          won?: number
        }
        Update: {
          analyzed?: number
          created_at?: string
          high?: number
          snapshot_date?: string
          total?: number
          user_id?: string
          won?: number
        }
        Relationships: []
      }
      legacy_company_access: {
        Row: {
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["pipeline_stage"] | null
          id: string
          note: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["pipeline_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          language_pref: string
          theme_pref: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          language_pref?: string
          theme_pref?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          language_pref?: string
          theme_pref?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "bd" | "sales" | "manager" | "marketing" | "viewer"
      company_priority: "high" | "medium" | "low" | "unranked"
      pipeline_stage:
        | "new_lead"
        | "researching"
        | "ai_analyzed"
        | "qualified"
        | "contact_ready"
        | "meeting_scheduled"
        | "proposal_sent"
        | "negotiation"
        | "won"
        | "lost"
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
      app_role: ["admin", "bd", "sales", "manager", "marketing", "viewer"],
      company_priority: ["high", "medium", "low", "unranked"],
      pipeline_stage: [
        "new_lead",
        "researching",
        "ai_analyzed",
        "qualified",
        "contact_ready",
        "meeting_scheduled",
        "proposal_sent",
        "negotiation",
        "won",
        "lost",
      ],
    },
  },
} as const
