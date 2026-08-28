type SupabaseLike = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
  };
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

/**
 * Optional live client. Phase 1 persists to local storage.
 * When both public Supabase values are present, publish can also insert.
 */
export function getSupabase(): SupabaseLike | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return null;
}
