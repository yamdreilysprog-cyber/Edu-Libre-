import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Para el cliente, no intentamos leer cookies manualmente si son HttpOnly.
// Supabase gestionará el estado de la sesión internamente si es necesario.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== 'undefined') {
  window.supabase = supabase;
}
