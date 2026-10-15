"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "../supabase/client";
import { isSupabaseConfigured } from "../supabase/config";
import {
  getUserProfile,
  loginUser,
  logoutUser,
  registerCreator,
  signInWithGoogle,
  completeCreatorProfile,
  RegisterInput,
  CompleteProfileInput,
} from "../supabase/auth";
import { UserProfile } from "../types/user";

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isConfigured: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ user: UserProfile; needsEmailConfirmation: boolean }>;
  completeProfile: (input: CompleteProfileInput) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isConfigured: false,
  error: null,
  login: async () => {},
  signInWithGoogle: async () => {},
  register: async () => ({ user: {} as UserProfile, needsEmailConfirmation: false }),
  completeProfile: async () => ({} as UserProfile),
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = isSupabaseConfigured();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState<string | null>(null);

  const extractAvatar = (u?: SupabaseUser | null): string | undefined => {
    if (!u?.user_metadata) return undefined;
    return (
      (u.user_metadata.avatar_url as string | undefined) ||
      (u.user_metadata.picture as string | undefined) ||
      undefined
    );
  };

  const fetchProfile = useCallback(async (userId: string, email?: string, metaAvatar?: string) => {
    try {
      const profile = await getUserProfile(userId, metaAvatar);
      if (profile) {
        if (!profile.photoURL && metaAvatar) {
          profile.photoURL = metaAvatar;
        }
        setUser(profile);
      } else if (email) {
        // Fallback profile if record is still syncing from DB trigger
        setUser({
          uid: userId,
          email: email,
          displayName: email.split("@")[0] || "Creator",
          role: "creator",
          photoURL: metaAvatar,
          profileCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      console.error("Failed to load user profile:", err);
      const message = err instanceof Error ? err.message : "Gagal memuat profil pengguna.";
      setError(message);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const supabase = createClient();

    // 1. Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const avatar = extractAvatar(session.user);
        await fetchProfile(session.user.id, session.user.email, avatar);
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Subscribe to auth changes (token refresh, sign in, sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const avatar = extractAvatar(session.user);
        await fetchProfile(session.user.id, session.user.email, avatar);
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  const login = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const userId = await loginUser(email, pass);
      await fetchProfile(userId, email);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async (redirectTo?: string) => {
    setError(null);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
      throw errorObj;
    }
  };

  const completeProfile = async (input: CompleteProfileInput): Promise<UserProfile> => {
    if (!supabaseUser) {
      throw new Error("Sesi pengguna tidak ditemukan. Silakan login kembali.");
    }
    setError(null);
    setLoading(true);
    try {
      const freshProfile = await completeCreatorProfile(supabaseUser.id, input);
      setUser(freshProfile);
      return freshProfile;
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setError(null);
    setLoading(true);
    try {
      const result = await registerCreator(input);
      setUser(result.user);
      return result;
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setSupabaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (supabaseUser) {
      await fetchProfile(supabaseUser.id, supabaseUser.email, extractAvatar(supabaseUser));
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        isAdmin,
        isSuperAdmin,
        isConfigured,
        error,
        login,
        signInWithGoogle: handleSignInWithGoogle,
        register,
        completeProfile,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
