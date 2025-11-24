"use client";

import { useEffect, useState } from "react";
import { ApiError, repoApi } from "@/lib/api";
import { ProjectIntro } from "@/types/repo";

type RepoData = ProjectIntro | { error: string } | null;

export function useRepoData(repoId: string) {
  const [data, setData] = useState<RepoData>(null);
  const [loading, setLoading] = useState(true);

  const errorMessage = (() => {
    if (!data) return null;
    if ('error' in data && typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error.trim();
    }
    return null;
  })();

  useEffect(() => {
    let isMounted = true;
    const key = `repo_${repoId}`;

    const loadRepoData = async () => {
      setData(null);
      setLoading(true);

      let localData: RepoData = null;
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          try {
            localData = JSON.parse(stored) as RepoData;
            if (isMounted) {
              setData(localData);
              setLoading(false);
            }
          } catch (e) {
            console.warn('Failed to parse stored repo data', e);
          }
        }
      }

      try {
        const remoteData = await repoApi.getRepo(repoId);
        if (!isMounted) {
          return;
        }
        setData(remoteData);
        setLoading(false);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(key, JSON.stringify(remoteData));
          } catch (storageError) {
            console.warn('Failed to persist repo data', storageError);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch repo data', error);
        if (!localData && isMounted) {
          let message = 'No repository data found. Try cloning again.';
          if (error instanceof ApiError) {
            try {
              const parsed = JSON.parse(error.message);
              message = parsed?.detail || parsed?.error || message;
            } catch (_) {
              message = error.message || message;
            }
          } else if (error instanceof Error) {
            message = error.message;
          }
          setData({ error: message });
          setLoading(false);
        }
      }
    };

    loadRepoData();

    return () => {
      isMounted = false;
    };
  }, [repoId]);

  return { data, loading, errorMessage };
}
