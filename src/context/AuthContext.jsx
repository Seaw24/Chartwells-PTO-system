import { createContext, useContext, useEffect, useState } from "react";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "../data/supabaseClient.jsx";
import { mapProfile, PROFILE_SELECT } from "../data/mappers.jsx";
import { friendlyError } from "../utils/errors.jsx";
import { clearSessionCache } from "../lib/queryClient.js";
export const AuthContext = createContext(null);
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be within AuthProvider");
  return auth;
}
export function SupabaseAuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    loading: isSupabaseConfigured,
    error: null,
  });
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabaseClient();
    let alive = true;
    let generation = 0;
    let identity;
    const hydrate = async (session) => {
      const request = ++generation;
      const id = session?.user?.id;
      if (id !== identity) {
        clearSessionCache();
        identity = id;
      }
      if (!id) {
        if (alive) setState({ user: null, loading: false, error: null });
        return;
      }
      try {
        const { data, error } = await client
          .from("profiles")
          .select(PROFILE_SELECT)
          .eq("id", id)
          .maybeSingle();
        if (!alive || request !== generation) return;
        if (error) throw error;
        if (!data || !data.is_active) {
          setState({
            user: null,
            loading: false,
            error: !data
              ? "Your account is not set up yet. Contact your manager."
              : "Your account is no longer active. Contact your manager.",
          });
          return;
        }
        setState({ user: mapProfile(data), loading: false, error: null });
      } catch (error) {
        if (alive && request === generation)
          setState({ user: null, loading: false, error: friendlyError(error) });
      }
    };
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return hydrate(data.session);
      })
      .catch((error) => {
        if (alive)
          setState({ user: null, loading: false, error: friendlyError(error) });
      });
    // Keep Supabase's auth callback synchronous; database calls run after its lock releases.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION")
        queueMicrotask(() => {
          if (alive) hydrate(session);
        });
    });
    return () => {
      alive = false;
      generation++;
      subscription.unsubscribe();
    };
  }, []);
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured)
      throw new Error(
        "Sign-in is not configured yet. Contact your administrator.",
      );
    const { error } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error)
      throw new Error(
        error.status === 400
          ? "That email and password did not match. Try again."
          : friendlyError(error),
      );
  };
  const signOut = async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw new Error(friendlyError(error));
    clearSessionCache();
    setState({ user: null, loading: false, error: null });
  };
  const completePasswordSetup = async (password) => {
    const client = getSupabaseClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error(friendlyError(error));
    const result = await client.rpc("complete_password_setup");
    if (result.error) throw new Error(friendlyError(result.error));
    setState((s) => ({
      ...s,
      user: { ...s.user, passwordSetupRequired: false },
    }));
  };
  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, completePasswordSetup }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const AuthProvider = SupabaseAuthProvider;
export function useCurrentUser() {
  return useAuth().user;
}
