"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { pageApi } from "../../../../../lib/api";
import { Page } from "../../../../../types/page";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SingleLineMarkdownBlock, BlockType } from '../../../../../component/chat/SingleLineMarkdownBlock';
import { useDefinitions } from '../../../../../hooks/useDefinitions';
import { useAutoSave } from '../../../../../hooks/pageHooks/useAutoSave';
import { useBlockManagement } from '../../../../../hooks/pageHooks/useBlockManagement';
import { useCommandHandling } from '../../../../../hooks/pageHooks/useCommandHandling';
import { useBlockSelection } from '../../../../../hooks/pageHooks/useBlockSelection';
import { usePageMermaid } from '../../../../../hooks/pageHooks/usePageMermaid';
import { parseContentToBlocks, blocksToContent, htmlToMarkdown } from '../../../../../component/editor/blockUtils';
import { Block } from '../../../../../types/page-editor';

export default function PageView() {
  const params = useParams();
  const pageId = params.pageId as string;
  const repoId = params.repoId as string;
  const { findMatches } = useDefinitions(repoId);

  // Page state
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);

  // Custom hooks
  const {
    focusedBlockIndex,
    setFocusedBlockIndex,
    selectedBlockIndices,
    setSelectedBlockIndices,
    handleBlockMouseDown,
    handleBlockMouseEnter,
    handleMouseUp,
    clearSelection,
  } = useBlockSelection();

  const {
    blocks,
    setBlocks,
    blocksRef,
    updateBlock: originalUpdateBlock,
    insertBlock: originalInsertBlock,
    insertBlockAbove: originalInsertBlockAbove,
    deleteBlock: originalDeleteBlock,
    handleOverflow: originalHandleOverflow,
    insertBlocksBelow: originalInsertBlocksBelow,
  } = useBlockManagement([], setHasUnsavedChanges, setFocusedBlockIndex);

  const {
    commandStates,
    registerCommandBlock,
    unregisterCommandBlock,
    handleCommandSubmit: submitCommand,
    resetCommandState,
  } = useCommandHandling();

  const saveState = useCallback(() => {
    setFuture([]);
    setPast(prev => [...prev.slice(-19), blocks]);
  }, [blocks]);

  const updateBlock = useCallback((index: number, updates: Partial<Block>) => {
    saveState();
    originalUpdateBlock(index, updates);
  }, [saveState, originalUpdateBlock]);

  const insertBlock = useCallback((index: number, type?: BlockType, content?: string) => {
    saveState();
    originalInsertBlock(index, type, content);
  }, [saveState, originalInsertBlock]);

  const insertBlockAbove = useCallback((index: number, type?: BlockType, content?: string) => {
    saveState();
    originalInsertBlockAbove(index, type, content);
  }, [saveState, originalInsertBlockAbove]);

  const deleteBlock = useCallback((index: number) => {
    saveState();
    originalDeleteBlock(index);
  }, [saveState, originalDeleteBlock]);

  const handleOverflow = useCallback((index: number, overflowText: string) => {
    saveState();
    originalHandleOverflow(index, overflowText);
  }, [saveState, originalHandleOverflow]);

  const insertBlocksBelow = useCallback((index: number, payloads: Array<{ type: BlockType; content: string }>) => {
    saveState();
    originalInsertBlocksBelow(index, payloads);
  }, [saveState, originalInsertBlocksBelow]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previousBlocks = past[past.length - 1];
    const newPast = past.slice(0, -1);
    setFuture(prev => [blocks, ...prev]);
    setPast(newPast);
    setBlocks(previousBlocks);
    clearSelection();
    setFocusedBlockIndex(0);
    setHasUnsavedChanges(true);
  }, [past, blocks, setPast, setFuture, setBlocks, clearSelection, setFocusedBlockIndex, setHasUnsavedChanges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const nextBlocks = future[0];
    const newFuture = future.slice(1);
    setPast(prev => [...prev, blocks]);
    setFuture(newFuture);
    setBlocks(nextBlocks);
    clearSelection();
    setFocusedBlockIndex(0);
    setHasUnsavedChanges(true);
  }, [future, blocks, setPast, setFuture, setBlocks, clearSelection, setFocusedBlockIndex, setHasUnsavedChanges]);

  // New functionality for deleting multiple selected blocks
  const handleDeleteSelected = useCallback(() => {
    if (selectedBlockIndices.length === 0) return;

    const indicesToDelete = [...selectedBlockIndices]
      .filter(idx => idx !== 0) // Skip title block
      .sort((a, b) => b - a); // Descending order

    if (indicesToDelete.length === 0) return;

    saveState();
    indicesToDelete.forEach(idx => originalDeleteBlock(idx));
    clearSelection();
  }, [selectedBlockIndices, originalDeleteBlock, clearSelection, saveState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockIndices.length > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockIndices.length, handleDeleteSelected]);

  const handleUndoRedoKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      redo();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleUndoRedoKeyDown);
    return () => document.removeEventListener('keydown', handleUndoRedoKeyDown);
  }, [undo, redo]);

  // Initialize auto-save
  useAutoSave(currentPage, blocks, setHasUnsavedChanges);

  // Initialize mermaid rendering
  usePageMermaid(blocks);

  useEffect(() => {
    if (pageId) {
      loadPage(pageId);
    }
  }, [pageId]);

  // Initialize blocks when page loads
  useEffect(() => {
    if (currentPage) {
      const parsedBlocks = parseContentToBlocks(currentPage.content);
      // Add title as the first block (h1)
      const titleBlock: Block = {
        id: 'title-block',
        type: 'h1',
        content: currentPage.title,
      };
      const newBlocks = [titleBlock, ...parsedBlocks];
      setBlocks(newBlocks);
      setFocusedBlockIndex(0);
    }
  }, [currentPage]);

  const loadPage = async (id: string) => {
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
  };

  const handleSave = async () => {
    if (!currentPage || blocks.length === 0) return;

    try {
      setSaving(true);
      const content = blocksToContent(blocks);
      // Get title from the first block
      const title = blocks[0]?.content || '';

      const response = await pageApi.updatePage(currentPage.id, {
        title,
        content,
      });

      setCurrentPage(response.page);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save page:', err);
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent, blockIndex: number) => {
    const blockType = blocks[blockIndex]?.type;
    if (blockType === 'code' || blockType === 'command') {
      // Let default paste behavior occur for multi-line capable blocks
      return;
    }

    e.preventDefault();

    let pastedText = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');

    if (html) {
      const md = htmlToMarkdown(html);
      pastedText = md; // Use markdown version, which may include syntax for formatting
    }

    if (!pastedText) return;

    const input = e.target as HTMLInputElement | HTMLTextAreaElement | null;
    let cursorPos = 0;
    let currentContent = '';
    if (input) {
      cursorPos = input.selectionStart || 0;
      currentContent = input.value;
    }

    const before = currentContent.substring(0, cursorPos);
    const after = currentContent.substring(cursorPos);

    if (!pastedText.includes('\n')) {
      // Single line paste: insert the (markdown) content at cursor position
      const newContent = before + pastedText + after;
      updateBlock(blockIndex, { content: newContent });
      setHasUnsavedChanges(true);
    } else {
      // Multi-line paste: split current block and insert parsed blocks
      saveState();

      let newBlocks = [...blocks];
      newBlocks[blockIndex] = { ...newBlocks[blockIndex], content: before };

      const pastedBlocks = parseContentToBlocks(pastedText).map((block, idx) => ({
        ...block,
        id: `pasted-${blockIndex}-${Date.now()}-${idx}`
      }));

      newBlocks.splice(blockIndex + 1, 0, ...pastedBlocks);

      if (after.trim()) {
        const afterBlock: Block = {
          id: `after-${blockIndex}-${Date.now()}`,
          type: 'text',
          content: after
        };
        newBlocks.splice(blockIndex + 1 + pastedBlocks.length, 0, afterBlock);
      }

      setBlocks(newBlocks);
      setFocusedBlockIndex(blockIndex + 1);
      setHasUnsavedChanges(true);
    }
  }, [blocks, updateBlock, setBlocks, setFocusedBlockIndex, setHasUnsavedChanges, parseContentToBlocks, htmlToMarkdown, saveState]);


  if (loading) {
    return (
      <div className="flex min-h-screen font-sans bg-background text-foreground">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading page...</div>
        </main>
      </div>
    );
  }

  if (error || !currentPage) {
    return (
      <div className="flex min-h-screen font-sans bg-background text-foreground">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-destructive">{error || 'Page not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen font-sans bg-background text-foreground"
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        // Clear selection when clicking on empty space
        if (e.target === e.currentTarget) {
          clearSelection();
        }
      }}
    >
      <main className="flex-1">
        <ScrollArea className="h-full min-h-screen">
          <div className="p-6 max-w-5xl mx-auto">
            <div className="relative">
              {blocks.map((block, index) => {
                // Apply compact spacing while maintaining typography hierarchy
                const getMarginClass = (type: BlockType) => {
                  const spacing = {
                    h1: 'mb-3 mt-3',   // Keep original spacing for headings
                    h2: 'mb-2 mt-2',   // Keep original spacing for headings
                    h3: 'mb-1 mt-1',   // Keep original spacing for headings
                    code: 'mb-2 mt-2',  // Keep original spacing for code
                    text: 'mb-0 mt-0',   // Reduced spacing for text blocks only
                    command: 'my-6'
                  };
                  return spacing[type] || 'mb-0 mt-0';
                };

                return (
                  <div
                    key={block.id}
                    onMouseDown={(e) => handleBlockMouseDown(index, e)}
                    onMouseEnter={() => handleBlockMouseEnter(index)}
                    className={selectedBlockIndices.includes(index) ? "bg-blue-10 dark:bg-blue-900/20 " : ""}
                  >
                    <SingleLineMarkdownBlock
                      content={block.content}
                      type={block.type}
                      isFocused={focusedBlockIndex === index}
                      isSelected={selectedBlockIndices.includes(index)}
                      onChange={(content) => updateBlock(index, { content })}
                      onTypeChange={(type) => {
                        // Prevent changing title block type
                        if (index === 0 && type !== 'h1') return;
                        updateBlock(index, { type });
                      }}
                      onFocus={() => {
                        setFocusedBlockIndex(index);
                        if (!selectedBlockIndices.includes(index)) {
                          setSelectedBlockIndices([index]);
                        }
                      }}
                      onNavigateUp={() => {
                        if (index > 0) {
                          setFocusedBlockIndex(index - 1);
                        }
                      }}
                      onNavigateDown={() => {
                        if (index < blocks.length - 1) {
                          setFocusedBlockIndex(index + 1);
                        }
                      }}
                      onEnter={() => insertBlock(index)}
                      onInsertAbove={(type) => insertBlockAbove(index, type ?? 'text')}
                      onBackspaceAtStart={() => {
                        if (index > 0) {
                          deleteBlock(index);
                        }
                        // Prevent deleting title block (index 0)
                      }}
                      onOverflow={(overflowText) => handleOverflow(index, overflowText)}
                      className={getMarginClass(block.type)}
                      repoId={repoId}
                      findMatches={findMatches}
                      onCommandSubmit={block.type === 'command' ? (value) => submitCommand(block.id, index, value, insertBlocksBelow) : undefined}
                      commandState={block.type === 'command' ? commandStates[block.id] : undefined}
                      onClose={block.type === 'command' ? () => deleteBlock(index) : undefined}
                      onPaste={(e) => handlePaste(e, index)}
                      onUndo={block.type === 'command' ? () => {
                        const state = commandStates[block.id];
                        if (state?.insertedCount && state.insertedCount > 0) {
                          saveState();
                          const count = state.insertedCount;
                          const latestBlocks = blocksRef.current;
                          const startDelete = index + 1;
                          const endDelete = startDelete + count;
                          const newBlocks = latestBlocks.slice(0, startDelete).concat(latestBlocks.slice(endDelete));
                          setBlocks(newBlocks);
                          setHasUnsavedChanges(true);
                          setFocusedBlockIndex(index);
                          clearSelection();
                          resetCommandState(block.id);
                        }
                      } : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
        
        {/* Floating Save Button */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="shadow-lg"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
