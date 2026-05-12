/**
 * Placeholder until `pnpm gen:types` runs.
 *
 * Generated from the live schema with:
 *   supabase gen types typescript --linked > src/lib/supabase/types.ts
 *
 * Keep this file overwritten by the generator — do not hand-edit.
 */
export type Database = {
  public: {
    Tables: {
      jobsites: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          notes: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          notes?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
      };
      people: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          notes: string | null;
          current_jobsite_id: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          notes?: string | null;
          current_jobsite_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          notes?: string | null;
          current_jobsite_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
