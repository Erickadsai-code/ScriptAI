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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_drafts: {
        Row: {
          approved_copy: string | null
          client_id: string | null
          connection_id: string | null
          content_type: string
          created_at: string
          error_message: string | null
          generated_copy: string | null
          id: string
          ig_media_id: string | null
          ig_permalink: string | null
          media_type: string
          media_url: string
          script_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_copy?: string | null
          client_id?: string | null
          connection_id?: string | null
          content_type: string
          created_at?: string
          error_message?: string | null
          generated_copy?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          media_type: string
          media_url: string
          script_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_copy?: string | null
          client_id?: string | null
          connection_id?: string | null
          content_type?: string
          created_at?: string
          error_message?: string | null
          generated_copy?: string | null
          id?: string
          ig_media_id?: string | null
          ig_permalink?: string | null
          media_type?: string
          media_url?: string
          script_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_drafts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_drafts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      gpt_config: {
        Row: {
          config_key: string
          config_value: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      knowledge_files: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          ai_score: number | null
          ai_score_explanation: string | null
          client_id: string | null
          collaborator_id: string | null
          content: string
          created_at: string
          ctr: number | null
          format_tags: string[] | null
          id: string
          interactions: number | null
          objective: string
          performance_score: number | null
          published_at: string | null
          reach: number | null
          social_network: string
          status: string
          title: string
          tone: string
          topic: string | null
          updated_at: string
          user_rating: number | null
          version_history: Json | null
          views: number | null
        }
        Insert: {
          ai_score?: number | null
          ai_score_explanation?: string | null
          client_id?: string | null
          collaborator_id?: string | null
          content: string
          created_at?: string
          ctr?: number | null
          format_tags?: string[] | null
          id?: string
          interactions?: number | null
          objective: string
          performance_score?: number | null
          published_at?: string | null
          reach?: number | null
          social_network: string
          status?: string
          title: string
          tone: string
          topic?: string | null
          updated_at?: string
          user_rating?: number | null
          version_history?: Json | null
          views?: number | null
        }
        Update: {
          ai_score?: number | null
          ai_score_explanation?: string | null
          client_id?: string | null
          collaborator_id?: string | null
          content?: string
          created_at?: string
          ctr?: number | null
          format_tags?: string[] | null
          id?: string
          interactions?: number | null
          objective?: string
          performance_score?: number | null
          published_at?: string | null
          reach?: number | null
          social_network?: string
          status?: string
          title?: string
          tone?: string
          topic?: string | null
          updated_at?: string
          user_rating?: number | null
          version_history?: Json | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string | null
          account_id: string
          account_name: string | null
          client_id: string
          created_at: string
          id: string
          metadata: Json | null
          platform: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id: string
          account_name?: string | null
          client_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string
          account_name?: string | null
          client_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_metrics: {
        Row: {
          comments: number | null
          connection_id: string
          created_at: string
          engagement_rate: number | null
          fetched_at: string
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          post_id: string
          post_url: string | null
          raw_data: Json | null
          reach: number | null
          saves: number | null
          script_id: string
          shares: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          connection_id: string
          created_at?: string
          engagement_rate?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          post_id: string
          post_url?: string | null
          raw_data?: Json | null
          reach?: number | null
          saves?: number | null
          script_id: string
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          connection_id?: string
          created_at?: string
          engagement_rate?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          post_id?: string
          post_url?: string | null
          raw_data?: Json | null
          reach?: number | null
          saves?: number | null
          script_id?: string
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_metrics_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_metrics_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "collaborator"
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
      app_role: ["admin", "collaborator"],
    },
  },
} as const
