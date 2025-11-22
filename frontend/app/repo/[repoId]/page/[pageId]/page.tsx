"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { pageApi } from "@/lib/api";
import { Page } from "@/types/page";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SingleLineMarkdownBlock, BlockType } from '@/component/chat/SingleLineMarkdownBlock';
import { useDefinitions } from '@/hooks/useDefinitions';
import { useAutoSave } from '@/hooks/pageHooks/useAutoSave';
import { useBlockManagement } from '@/hooks/pageHooks/useBlockManagement';
import { useCommandHandling } from '@/hooks/pageHooks/useCommandHandling';
import { useBlockSelection } from '@/hooks/pageHooks/useBlockSelection';
import { usePageMermaid } from '@/hooks/pageHooks/usePageMermaid';
import { parseContentToBlocks, blocksToContent, htmlToMarkdown } from '@/component/editor/blockUtils';
import { Block } from '@/types/page-editor';
import { useUndoRedo } from '@/hooks/pageHooks/useUndoRedo';
import { usePageData } from '@/hooks/pageHooks/usePageData';
import { useKeyboardShortcuts } from '@/hooks/pageHooks/useKeyboardShortcuts';
import { usePasteHandler } from '@/hooks/pageHooks/usePasteHandler';
import { useAutocompletion } from '@/hooks/pageHooks/useAutocompletion';


export default function PageView() {
  const params = useParams();
  const pageId = params.pageId as string;
  const repoId = params.repoId as string;
  const { findMatches } = useDefinitions(repoId);
  const { currentPage, loading, error, savePage } = usePageData(pageId);

  // Page state
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Extend pendingReplacement type implicitly with isInitial and commandBlockIndex
  const [pendingReplacement, setPendingReplacement] = useState<{ insertIndex: number; selectedIndices: number[]; selectedContent: string; isInitial?: boolean; commandBlockIndex?: number; } | null>(null);

  // Caret position for autocompletion (block-local offset)
  const [caretInfo, setCaretInfo] = useState<{ blockIndex: number; offset: number } | null>(null);

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
  } = useCommandHandling(pageId, repoId, findMatches);

  const { saveState, undo: performUndo, redo: performRedo, multiUndo } = useUndoRedo(blocks);

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

  const handleCommandResponse = useCallback((commandIndex: number, payloads: Array<{ type: BlockType; content: string }>) => {
    console.log('handleCommandResponse called', { commandIndex, payloadsLength: payloads.length, hasPending: !!pendingReplacement });
    if (payloads.length === 0) return;

    const newBlockEntries = payloads.map((payload) => ({
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ...payload,
    }));

    console.log('Created newBlockEntries', newBlockEntries.map(e => ({ id: e.id, type: e.type, contentPreview: e.content.substring(0, 50) + '...' })));

    saveState();

    setBlocks((prevBlocks) => {
      let finalBlocks: Block[];
      let tempBlocks: Block[] = [...prevBlocks];
      let insertPos: number;

      if (pendingReplacement) {
        console.log('Processing with pendingReplacement', pendingReplacement);
        const { insertIndex, selectedIndices, isInitial = false } = pendingReplacement;
        const commandBlockIdx = pendingReplacement.commandBlockIndex || insertIndex;
        const offset = isInitial ? 1 : 0;
        let currentSelectedIndices = selectedIndices.map((i: number) => i + offset).sort((a, b) => b - a);

        console.log('Computed currentSelectedIndices', currentSelectedIndices);

        // Splice selected indices, skip if it's the command block
        currentSelectedIndices.forEach((idx) => {
          if (idx < tempBlocks.length && idx !== commandBlockIdx) {
            tempBlocks.splice(idx, 1);
          }
        });

        // Insert after command block
        insertPos = commandBlockIdx + 1;
        finalBlocks = [
          ...tempBlocks.slice(0, insertPos),
          ...newBlockEntries,
          ...tempBlocks.slice(insertPos),
        ];
      } else {
        console.log('No pending, inserting after command');
        insertPos = commandIndex + 1;
        finalBlocks = [
          ...prevBlocks.slice(0, insertPos),
          ...newBlockEntries,
          ...prevBlocks.slice(insertPos),
        ];
      }

      blocksRef.current = finalBlocks;
      console.log('Final blocks length after insert/replace', finalBlocks.length);
      return finalBlocks;
    });

    // Set new pendingReplacement for iterative query
    if (payloads.length > 0) {
      const newCommandBlockIndex = commandIndex;
      const newInsertIndex = commandIndex + 1;
      const newSelectedIndices = Array.from({ length: payloads.length }, (_, i) => newInsertIndex + i);
      const newSelectedContent = payloads.map((p) => p.content).join('\n\n');

      const newPending = {
        insertIndex: newInsertIndex,
        selectedIndices: newSelectedIndices,
        selectedContent: newSelectedContent,
        isInitial: false,
        commandBlockIndex: newCommandBlockIndex,
      };

      setPendingReplacement(newPending);
      console.log('Set new pendingReplacement for next iterative query', newPending);
    } else {
      setPendingReplacement(null);
    }

    // Keep focus on the command block
    setFocusedBlockIndex(commandIndex);
    clearSelection();
    setHasUnsavedChanges(true);
  }, [saveState, blocksRef, setBlocks, setFocusedBlockIndex, clearSelection, setHasUnsavedChanges, pendingReplacement]);

  const handleUndo = useCallback(() => {
    const newBlocks = performUndo();
    if (newBlocks) {
      setBlocks(newBlocks);
      clearSelection();
      setFocusedBlockIndex(0);
      setHasUnsavedChanges(true);
    }
  }, [performUndo, setBlocks, clearSelection, setFocusedBlockIndex, setHasUnsavedChanges]);

  const handleRedo = useCallback(() => {
    const newBlocks = performRedo();
    if (newBlocks) {
      setBlocks(newBlocks);
      clearSelection();
      setFocusedBlockIndex(0);
      setHasUnsavedChanges(true);
    }
  }, [performRedo, setBlocks, clearSelection, setFocusedBlockIndex, setHasUnsavedChanges]);

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

  useKeyboardShortcuts({
    selectedBlockIndices,
    focusedBlockIndex,
    blocks,
    insertBlockAbove,
    setPendingReplacement,
    setSelectedBlockIndices,
    setFocusedBlockIndex,
    handleDeleteSelected,
    handleUndo,
    handleRedo
  });

  const { handlePaste: pasteHandler } = usePasteHandler({
    blocks,
    updateBlock,
    setBlocks,
    setFocusedBlockIndex,
    setHasUnsavedChanges,
    saveState
  });

  // Initialize auto-save
  useAutoSave(currentPage, blocks, setHasUnsavedChanges);
  
  // Initialize mermaid rendering
  usePageMermaid(blocks);

  // Autocompletion suggestion hook (headings/text only)
  const { suggestion, inFlight, clearSuggestion, markRejected } = useAutocompletion({
    blocks,
    caretInfo,
    focusedBlockIndex,
    enabledTypes: ['h1', 'h2', 'h3', 'text'],
    debounceMs: 300,
  });

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
  }, [currentPage, setBlocks, setFocusedBlockIndex]);

  useEffect(() => {
    const hasCommandBlock = blocks.some(block => block.type === 'command');
    if (!hasCommandBlock && pendingReplacement) {
      console.log('No command blocks left, clearing pendingReplacement');
      setPendingReplacement(null);
      clearSelection();
    }
  }, [blocks, pendingReplacement, setPendingReplacement, clearSelection]);

  const handleSave = async () => {
    if (!currentPage || blocks.length === 0) return;

    try {
      setSaving(true);
      const content = blocksToContent(blocks);
      const title = blocks[0]?.content || '';

      const updatedPage = await savePage(title, content);
      if (updatedPage) {
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      // Error handled by hook
      console.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

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

                // Compute shifted selected for highlighting
                const shiftedSelected = pendingReplacement 
                  ? (pendingReplacement.isInitial 
                      ? pendingReplacement.selectedIndices.map((i: number) => i + 1)
                      : pendingReplacement.selectedIndices
                    ) 
                  : [];
                const commandBlockIdx = pendingReplacement?.commandBlockIndex;

                return (
                  <div
                    key={block.id}
                    onMouseDown={(e) => handleBlockMouseDown(index, e)}
                    onMouseEnter={() => handleBlockMouseEnter(index)}
                    className={
                      (() => {
                        if (pendingReplacement && shiftedSelected.includes(index) && index !== commandBlockIdx) {
                          return "bg-yellow-100 dark:bg-yellow-300/20"; // yellow for command selection blocks only
                        } else if (selectedBlockIndices.includes(index) && (!commandBlockIdx || index !== commandBlockIdx)) {
                          return "bg-blue-100 dark:bg-blue-900/20"; // Blue for regular selection
                        } else {
                          return "";
                        }
                      })()
                    }
                  >
                    <SingleLineMarkdownBlock
                      content={block.content}
                      type={block.type}
                      isFocused={focusedBlockIndex === index}
                      isSelected={selectedBlockIndices.includes(index) || (shiftedSelected.includes(index) && index !== commandBlockIdx)}
                      onChange={(content) => updateBlock(index, { content })}
                      onTypeChange={(type) => {
                        // Prevent changing title block type
                        if (index === 0 && type !== 'h1') return;
                        updateBlock(index, { type });
                      }}
                      onFocus={() => {
                        setFocusedBlockIndex(index);
                        if (pendingReplacement && index === pendingReplacement.insertIndex) {
                          // Keep existing selection for command block
                        } else if (!selectedBlockIndices.includes(index)) {
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
                        console.log('onBackspaceAtStart called for block at index', index, 'type:', block.type, 'content length:', block.content.length);
                        if (index > 0) {
                          console.log('Deleting block at index', index);
                          deleteBlock(index);
                        }
                        // Prevent deleting title block (index 0)
                      }}
                      onOverflow={(overflowText) => handleOverflow(index, overflowText)}
                      className={getMarginClass(block.type)}
                      repoId={repoId}
                      findMatches={findMatches}

                      // Autocompletion caret and ghost props
                      blockIndex={index}
                      onCaretChange={(info) => setCaretInfo(info)}
                      ghostSuggestion={focusedBlockIndex === index ? (suggestion ?? null) : null}
                      onClearGhost={() => clearSuggestion()}
                      onAcceptGhost={() => clearSuggestion()}
                      onRejectGhost={() => { markRejected(); }}

                      onCommandSubmit={block.type === 'command' ? (typedValue) => {
                        console.log('onCommandSubmit', { blockId: block.id, index, typedValuePreview: typedValue.substring(0, 50) + '...' });
                        const userQuery = typedValue;
                        const selectedContent = pendingReplacement?.selectedContent;
                        submitCommand(block.id, index, userQuery, handleCommandResponse, blocks, selectedContent);
                      } : undefined}
                      commandState={block.type === 'command' ? commandStates[block.id] ?? undefined : undefined}
                      onClose={block.type === 'command' ? () => {
                        console.log('onClose called for command block at index', index, 'blockId:', block.id);
                        setPendingReplacement(null);
                        clearSelection();
                        deleteBlock(index);
                      } : undefined}
                      onPaste={(e) => pasteHandler(e, index)}
                      onUndo={block.type === 'command' ? () => {
                        console.log('onUndo called for command block at index', index);
                        const count = commandStates[block.id]?.insertedCount || 0;
                        const newBlocks = multiUndo(count + 1);
                        if (newBlocks) {
                          setBlocks(newBlocks);
                          clearSelection();
                          setFocusedBlockIndex(0);
                          setHasUnsavedChanges(true);
                        }
                        setPendingReplacement(null);
                        deleteBlock(index);
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
