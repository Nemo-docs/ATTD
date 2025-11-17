import React, { useState, useEffect, useCallback } from 'react';
import { pageApi } from '../../lib/api';
import { Page } from '../../types/page';

export const usePageData = (pageId: string) => {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await pageApi.getPage(id);
      setCurrentPage(response.page);
    } catch (err) {
      console.error('Failed to load page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePage = useCallback(async (title: string, content: string) => {
    if (!currentPage) return null;
    try {
      const response = await pageApi.updatePage(currentPage.id, {
        title,
        content,
      });
      setCurrentPage(response.page);
      setError(null);
      return response.page;
    } catch (err) {
      console.error('Failed to save page:', err);
      setError('Failed to save page');
      return null;
    }
  }, [currentPage]);

  useEffect(() => {
    if (pageId) {
      loadPage(pageId);
    }
  }, [pageId, loadPage]);

  return { currentPage, loading, error, loadPage, savePage };
};
