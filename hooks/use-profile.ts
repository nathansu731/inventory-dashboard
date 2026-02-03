"use client";

import { useEffect, useState } from "react";

export type UserProfile = Record<string, unknown> & {
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    sub?: string;
};

type UseProfileState = {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
};

export const useProfile = (): UseProfileState => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadProfile = async () => {
            try {
                const response = await fetch("/api/auth/me", {
                    signal: controller.signal,
                });
                if (!response.ok) {
                    if (response.status !== 401) {
                        setError(`profile_error_${response.status}`);
                    }
                    return;
                }
                const payload = (await response.json()) as { profile?: UserProfile };
                if (isMounted) {
                    setProfile(payload.profile ?? null);
                }
            } catch (err) {
                if (isMounted && !(err instanceof DOMException && err.name === "AbortError")) {
                    setError("profile_error");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadProfile();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    return { profile, isLoading, error };
};
