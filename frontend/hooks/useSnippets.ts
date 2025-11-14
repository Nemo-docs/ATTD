import { useCallback, useEffect, useRef, useState } from "react";
import { snippetApi } from "@/lib/snippetApi";
import type { Snippet } from "@/types/snippet";

type UseSnippetsResult = {
  snippets: Snippet[];
  filteredSnippets: Snippet[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchSnippets: (value: string) => void;
  refresh: () => Promise<void>;
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const scoreSnippet = (snippet: Snippet, normalizedQuery: string, terms: string[]) => {
  const content = snippet.content.toLowerCase();
  let score = 0;

  if (content === normalizedQuery) score += 120;
  else if (content.startsWith(normalizedQuery)) score += 90;
  else if (content.includes(normalizedQuery)) score += 60;

  terms.forEach((term) => {
    if (content.includes(term)) score += 15;
  });

  snippet.tags?.forEach((tag) => {
    const normalizedTag = tag.toLowerCase();
    if (normalizedTag === normalizedQuery) score += 80;
    else if (normalizedTag.startsWith(normalizedQuery)) score += 50;
    else if (normalizedTag.includes(normalizedQuery)) score += 30;

    terms.forEach((term) => {
      if (normalizedTag.includes(term)) score += 10;
    });
  });
  // add scoring with snippet timestamp as a factor, treat it like a string match, use terms to match the timestamp
  terms.forEach((term) => {
    if (snippet.createdAt.includes(term)) score += 10;
    else if (snippet.createdAt.startsWith(term)) score += 5;
    else if (snippet.createdAt.includes(term)) score += 3;
  });

  return score;
};

const applySearch = (list: Snippet[], query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return list;

  const terms = tokenize(query);

  return list
    .map((snippet) => ({
      snippet,
      score: scoreSnippet(snippet, normalizedQuery, terms),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ snippet }) => snippet);
};

export const useSnippets = (userId: string): UseSnippetsResult => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const snippetsRef = useRef<Snippet[]>([]);
  const queryRef = useRef("");

  const syncSnippets = useCallback((next: Snippet[]) => {
    snippetsRef.current = next;
    setSnippets(next);
    setFilteredSnippets(applySearch(next, queryRef.current));
  }, []);

  const loadSnippets = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await snippetApi.getAllSnippets(userId);
      if (response.total_count === 0) {
        try {
          await snippetApi.ensureCollection(userId);
        } catch (ensureError) {
          console.warn("ensureCollection failed", ensureError);
        }
      }
      syncSnippets(response.snippets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load snippets";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, syncSnippets]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const searchSnippets = useCallback((value: string) => {
    queryRef.current = value;
    setSearchQuery(value);
    setFilteredSnippets(applySearch(snippetsRef.current, value));
  }, []);

  const refresh = useCallback(async () => {
    await loadSnippets();
  }, [loadSnippets]);

  return {
    snippets,
    filteredSnippets,
    isLoading,
    error,
    searchQuery,
    searchSnippets,
    refresh,
  };
};

