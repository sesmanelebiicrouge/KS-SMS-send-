import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getAuthenticatedUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { user: null, error: "La configuration Supabase serveur est absente." };
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Token verification does not require cookie mutation in this route.
          }
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { user: null, error: "Session absente ou expirée. Connectez-vous de nouveau." };
    return { user: data.user, error: null };
  } catch {
    return { user: null, error: "Impossible de vérifier la session utilisateur." };
  }
}
