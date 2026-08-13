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
      dues: {
        Row: {
          amount: number
          created_at: string | null
          house_number: string | null
          id: string
          paid_at: string | null
          period: string
          period_month: string | null
          resident_name: string | null
          status: Database["public"]["Enums"]["due_status"]
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          house_number?: string | null
          id?: string
          paid_at?: string | null
          period: string
          period_month?: string | null
          resident_name?: string | null
          status?: Database["public"]["Enums"]["due_status"]
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          house_number?: string | null
          id?: string
          paid_at?: string | null
          period?: string
          period_month?: string | null
          resident_name?: string | null
          status?: Database["public"]["Enums"]["due_status"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dues_ledger: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payer_name: string
          payer_type: string
          period_month: string
          property_id: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payer_name: string
          payer_type: string
          period_month: string
          property_id?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payer_name?: string
          payer_type?: string
          period_month?: string
          property_id?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dues_ledger_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          arrival_date: string
          created_at: string | null
          guest_name: string
          id: string
          notes: string | null
          stay_duration_days: number
          tenant_id: string
        }
        Insert: {
          arrival_date: string
          created_at?: string | null
          guest_name: string
          id?: string
          notes?: string | null
          stay_duration_days?: number
          tenant_id: string
        }
        Update: {
          arrival_date?: string
          created_at?: string | null
          guest_name?: string
          id?: string
          notes?: string | null
          stay_duration_days?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          phone_number: string
          role: Database["public"]["Enums"]["user_role"]
          rt_rw: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          phone_number: string
          role?: Database["public"]["Enums"]["user_role"]
          rt_rw?: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          phone_number?: string
          role?: Database["public"]["Enums"]["user_role"]
          rt_rw?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          created_at: string | null
          failed_pin_attempts: number | null
          house_rules: string | null
          id: string
          name: string | null
          owner_id: string | null
          pin_code: string | null
          pin_locked_until: string | null
          property_name: string | null
          slug: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          failed_pin_attempts?: number | null
          house_rules?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          pin_code?: string | null
          pin_locked_until?: string | null
          property_name?: string | null
          slug?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          failed_pin_attempts?: number | null
          house_rules?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          pin_code?: string | null
          pin_locked_until?: string | null
          property_name?: string | null
          slug?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          id: string
          is_occupied: boolean | null
          property_id: string
          room_number: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          property_id: string
          room_number: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          property_id?: string
          room_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address_ktp: string | null
          agreed_rules: boolean | null
          agreed_rules_at: string | null
          birth_date: string | null
          created_at: string | null
          emergency_contact: string | null
          entry_date: string | null
          full_address: string | null
          full_name: string | null
          household_id: string | null
          id: string
          is_head: boolean | null
          ktp_path: string | null
          ktp_storage_path: string | null
          ktp_url: string | null
          lease_end: string | null
          lease_start: string | null
          name: string | null
          nik_masked: string | null
          phone: string | null
          phone_number: string | null
          property_id: string | null
          relation: string | null
          room_id: string | null
          room_number: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          address_ktp?: string | null
          agreed_rules?: boolean | null
          agreed_rules_at?: string | null
          birth_date?: string | null
          created_at?: string | null
          emergency_contact?: string | null
          entry_date?: string | null
          full_address?: string | null
          full_name?: string | null
          household_id?: string | null
          id?: string
          is_head?: boolean | null
          ktp_path?: string | null
          ktp_storage_path?: string | null
          ktp_url?: string | null
          lease_end?: string | null
          lease_start?: string | null
          name?: string | null
          nik_masked?: string | null
          phone?: string | null
          phone_number?: string | null
          property_id?: string | null
          relation?: string | null
          room_id?: string | null
          room_number?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          address_ktp?: string | null
          agreed_rules?: boolean | null
          agreed_rules_at?: string | null
          birth_date?: string | null
          created_at?: string | null
          emergency_contact?: string | null
          entry_date?: string | null
          full_address?: string | null
          full_name?: string | null
          household_id?: string | null
          id?: string
          is_head?: boolean | null
          ktp_path?: string | null
          ktp_storage_path?: string | null
          ktp_url?: string | null
          lease_end?: string | null
          lease_start?: string | null
          name?: string | null
          nik_masked?: string | null
          phone?: string | null
          phone_number?: string | null
          property_id?: string | null
          relation?: string | null
          room_id?: string | null
          room_number?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenants_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      due_status: "unpaid" | "paid"
      tenant_status: "pending" | "approved" | "rejected" | "checked_out"
      user_role: "admin_rt" | "pemilik" | "penghuni"
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
      due_status: ["unpaid", "paid"],
      tenant_status: ["pending", "approved", "rejected", "checked_out"],
      user_role: ["admin_rt", "pemilik", "penghuni"],
    },
  },
} as const
