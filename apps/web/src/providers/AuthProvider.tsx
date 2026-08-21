"use client";

import { useEffect } from 'react';
import { onAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { fetchAppConfig } from '@/lib/api';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch dynamic config from backend
    fetchAppConfig()
      .then(() => {
        if (!isMounted) return;
        const unsubscribe = onAuth((user) => {
          if (isMounted) setUser(user);
        });
        return unsubscribe;
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    // 2. Immediate subscription with safety unblock
    const unsubscribeImmediate = onAuth((user) => {
      if (isMounted) setUser(user);
    });

    const fallbackTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      if (unsubscribeImmediate) unsubscribeImmediate();
    };
  }, [setUser, setLoading]);

  return <>{children}</>;
}
