import { useState, useEffect, useMemo } from 'react';
import { autoGenerationApi } from '@/lib/api';

interface Definition {
  node_type: 'file' | 'class' | 'function';
  node_name: string;
  code_snippet: string;
  start_end_lines: number[];
  file_name: string;
}

interface CachedDefinitions {
  definitions: Definition[];
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'definitions_cache_';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const useDefinitions = (repoId: string) => {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${CACHE_KEY_PREFIX}${repoId}`;

  // Load definitions from cache or API
  useEffect(() => {
    const loadDefinitions = async () => {
      if (!repoId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Check local storage first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cachedData: CachedDefinitions = JSON.parse(cached);
          const now = Date.now();

          // Check if cache is still valid (less than 1 hour old)
          if (now - cachedData.timestamp < CACHE_DURATION_MS) {
            setDefinitions(cachedData.definitions);
            setIsLoading(false);
            return;
          }
        }

        // Fetch from API if no cache or cache is expired
        const freshDefinitions = await autoGenerationApi.getDefinitions(repoId);

        // Update state
        setDefinitions(freshDefinitions);

        // Update cache
        const cacheData: CachedDefinitions = {
          definitions: freshDefinitions,
          timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      } catch (err) {
        console.error('Failed to load definitions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load definitions');
      } finally {
        setIsLoading(false);
      }
    };

    loadDefinitions();
  }, [repoId, cacheKey]);

  // Lexical matching function
  const findMatches = useMemo(() => (query: string): Definition[] => {
    if (!query.trim() || definitions.length === 0) return [];

    const searchTerm = query.toLowerCase().trim();

    // Score each definition based on lexical similarity
    const scored = definitions.map(def => {
      const nodeName = def.node_name.toLowerCase();
      const fileName = def.file_name.toLowerCase();

      let score = 0;

      // Exact match gets highest score
      if (nodeName === searchTerm) score += 100;
    //   else if (fileName === searchTerm) score += 90;

      // Starts with gets high score
      else if (nodeName.startsWith(searchTerm)) score += 80;
    //   else if (fileName.startsWith(searchTerm)) score += 70;

      // Contains gets medium score
      else if (nodeName.includes(searchTerm)) score += 60;
    //   else if (fileName.includes(searchTerm)) score += 50;


      return { definition: def, score };
    });

    // Sort by score descending, deduplicate, and return top 7
    const uniqueResults = new Map();
    
    scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .forEach(item => {
        const key = `${item.definition.node_type}-${item.definition.node_name}-${item.definition.file_name}`;
        if (!uniqueResults.has(key) || uniqueResults.get(key).score < item.score) {
          uniqueResults.set(key, item);
        }
      });

    return Array.from(uniqueResults.values())
      .slice(0, 5)
      .map(item => item.definition);
  }, [definitions]);

  return {
    definitions,
    isLoading,
    error,
    findMatches,
  };
};
