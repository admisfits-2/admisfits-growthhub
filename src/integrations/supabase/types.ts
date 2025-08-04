export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      google_sheets_connections: {
        Row: {
          column_mappings: Json
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          last_sync: string | null
          name: string
          project_id: string
          refresh_interval: string
          sheet_id: string
          sheet_url: string
        }
        Insert: {
          column_mappings?: Json
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          name: string
          project_id: string
          refresh_interval?: string
          sheet_id: string
          sheet_url: string
        }
        Update: {
          column_mappings?: Json
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          name?: string
          project_id?: string
          refresh_interval?: string
          sheet_id?: string
          sheet_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_sheets_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ad_spend: number
          agency_fee_amount: number
          agency_fee_percentage: number
          client_name: string
          created_at: string
          created_by: string
          date_range_end: string
          date_range_start: string
          id: string
          invoice_number: string
          project_id: string
          refunds: number | null
          revenue_generated: number
          status: Database["public"]["Enums"]["invoice_status"]
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          ad_spend: number
          agency_fee_amount: number
          agency_fee_percentage?: number
          client_name: string
          created_at?: string
          created_by: string
          date_range_end: string
          date_range_start: string
          id?: string
          invoice_number: string
          project_id: string
          refunds?: number | null
          revenue_generated: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          ad_spend?: number
          agency_fee_amount?: number
          agency_fee_percentage?: number
          client_name?: string
          created_at?: string
          created_by?: string
          date_range_end?: string
          date_range_start?: string
          id?: string
          invoice_number?: string
          project_id?: string
          refunds?: number | null
          revenue_generated?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          date: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          date: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_metrics: {
        Row: {
          ad_spend: number | null
          cash_collected_post_refund: number | null
          cash_collected_pre_refund: number | null
          created_at: string
          date: string
          id: string
          new_sales_calls: number | null
          project_id: string
          qualified_leads: number | null
          refunds: number | null
          sales_value: number | null
          scheduled_calls: number | null
          show_ups: number | null
          total_sales: number | null
          updated_at: string
        }
        Insert: {
          ad_spend?: number | null
          cash_collected_post_refund?: number | null
          cash_collected_pre_refund?: number | null
          created_at?: string
          date: string
          id?: string
          new_sales_calls?: number | null
          project_id: string
          qualified_leads?: number | null
          refunds?: number | null
          sales_value?: number | null
          scheduled_calls?: number | null
          show_ups?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Update: {
          ad_spend?: number | null
          cash_collected_post_refund?: number | null
          cash_collected_pre_refund?: number | null
          created_at?: string
          date?: string
          id?: string
          new_sales_calls?: number | null
          project_id?: string
          qualified_leads?: number | null
          refunds?: number | null
          sales_value?: number | null
          scheduled_calls?: number | null
          show_ups?: number | null
          total_sales?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string
          created_at: string
          created_by: string
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
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
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "analyst" | "client"
      invoice_status: "draft" | "sent" | "paid" | "overdue"
      project_status: "active" | "inactive" | "archived"
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
      app_role: ["admin", "manager", "analyst", "client"],
      invoice_status: ["draft", "sent", "paid", "overdue"],
      project_status: ["active", "inactive", "archived"],
    },
  },
} as const
