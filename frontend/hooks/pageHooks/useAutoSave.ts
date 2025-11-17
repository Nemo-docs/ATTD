import { useRef, useEffect } from 'react';
import { pageApi } from '../../lib/api';
import { Page } from '../../types/page';
import { Block } from '../../types/page-editor';
import { blocksToContent } from '../../component/editor/blockUtils';

export const useAutoSave = (
  currentPage: Page | null,
  blocks: Block[],
  setHasUnsavedChanges: (value: boolean) => void
) => {
  // Refs to track last saved content to avoid unnecessary saves
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef<boolean>(false);
  const currentPageRef = useRef<Page | null>(currentPage);
  const blocksRef = useRef<Block[]>(blocks);

  // Update refs whenever props change
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Auto-save function that only saves if content changed
  const performAutoSave = async () => {
    const currentBlocks = blocksRef.current;
    const page = currentPageRef.current;
    console.log('Auto-save check:', { page: !!page, blocksLength: currentBlocks.length, isAutoSaving: isAutoSavingRef.current });

    if (!page || currentBlocks.length === 0 || isAutoSavingRef.current) return;

    const content = blocksToContent(currentBlocks);
    const title = currentBlocks[0]?.content || '';

    console.log('Auto-save content check:', {
      contentLength: content.length,
      title,
      lastSavedContentLength: lastSavedContentRef.current.length,
      lastSavedTitle: lastSavedTitleRef.current,
      hasChanges: !(content === lastSavedContentRef.current && title === lastSavedTitleRef.current)
    });

    // Check if content or title actually changed
    if (content === lastSavedContentRef.current && title === lastSavedTitleRef.current) {
      return; // No changes, skip save
    }

    try {
      console.log('Auto-saving page...');
      isAutoSavingRef.current = true;
      await pageApi.updatePage(page.id, {
        title,
        content,
      });

      // Update refs without causing re-render
      lastSavedContentRef.current = content;
      lastSavedTitleRef.current = title;
      setHasUnsavedChanges(false);
      console.log('Auto-save completed successfully');
    } catch (err) {
      console.error('Failed to auto-save page:', err);
      // Don't set error state for auto-save failures to avoid UI disruption
    } finally {
      isAutoSavingRef.current = false;
    }
  };

  // Set up auto-save interval when component mounts
  useEffect(() => {
    console.log('Setting up auto-save interval');
    autoSaveIntervalRef.current = setInterval(() => {
      console.log('Auto-save interval triggered');
      performAutoSave();
    }, 5000);

    // Cleanup interval when component unmounts
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Initialize last saved refs when currentPage changes
  useEffect(() => {
    if (currentPage) {
      lastSavedContentRef.current = currentPage.content;
      lastSavedTitleRef.current = currentPage.title;
    } else {
      lastSavedContentRef.current = '';
      lastSavedTitleRef.current = '';
    }
  }, [currentPage]);

  return {
    performAutoSave
  };
};
