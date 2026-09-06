import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

export function createAstroSupabaseClient(Astro) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(Astro.request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          Astro.cookies.set(name, value, options)
        );
      },
    },
  });
}
