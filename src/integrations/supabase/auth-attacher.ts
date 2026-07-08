import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/** Client middleware: attaches the current Supabase access token to server-fn requests. */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      sendContext: {},
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  },
);

/** Helper for imperative fetch/serverFn calls that need auth headers. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}
