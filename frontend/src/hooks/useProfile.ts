import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import type { User } from "../types/auth";

async function loadProfile(): Promise<User | null> {
  try {
    if (!useAuthStore.getState().accessToken) {
      const refreshed = await authApi.refresh();
      useAuthStore.getState().setAccessToken(refreshed.accessToken);
    }

    const profile = await authApi.profile();
    useAuthStore.getState().setUser(profile.data);
    return profile.data;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: loadProfile,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
