"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  apiFetch,
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  type PublicUser,
} from "@/lib/api";

export interface AuthState {
  user: PublicUser | null;
  loading: boolean;
}

export function useAuth(): AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
} {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const refresh = async () => {
    const token = getToken();
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    try {
      const user = await apiFetch.get<PublicUser>("/auth/me");
      setStoredUser(user);
      setState({ user, loading: false });
    } catch {
      clearToken();
      setState({ user: null, loading: false });
    }
  };

  useEffect(() => {
    const cached = getStoredUser();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ user: cached, loading: true });
    }
    void refresh();
  }, []);

  useEffect(() => {
    if (!state.loading && !state.user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [state.loading, state.user, pathname, router]);

  const login = async (email: string, password: string) => {
    const result = await apiFetch.post<{ token: string; user: PublicUser }>(
      "/auth/login",
      { email, password },
    );
    setToken(result.token);
    setStoredUser(result.user);
    setState({ user: result.user, loading: false });
  };

  const logout = () => {
    clearToken();
    setState({ user: null, loading: false });
    router.replace("/login");
  };

  return { ...state, login, logout, refresh };
}

export function useRequireAuth(): AuthState {
  const auth = useAuth();
  return auth;
}