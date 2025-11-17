import React, { useCallback, useEffect } from 'react';
import { Block } from '../../types/page-editor';
import { BlockType } from '../../component/chat/SingleLineMarkdownBlock';

interface PendingReplacement {
  insertIndex: number;
  selectedIndices: number[];
  selectedContent: string;
  isInitial?: boolean;
  commandBlockIndex?: number;
}

interface KeyboardShortcutsProps {
  selectedBlockIndices: number[];
  focusedBlockIndex: number;
  blocks: Block[];
  insertBlockAbove: (index: number, type?: BlockType, content?: string) => void;
  setPendingReplacement: React.Dispatch<React.SetStateAction<PendingReplacement | null>>;
  setSelectedBlockIndices: (indices: number[]) => void;
  setFocusedBlockIndex: (index: number) => void;
  handleDeleteSelected: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

export const useKeyboardShortcuts = (props: KeyboardShortcutsProps) => {
  const {
    selectedBlockIndices,
    focusedBlockIndex,
    blocks,
    insertBlockAbove,
    setPendingReplacement,
    setSelectedBlockIndices,
    setFocusedBlockIndex,
    handleDeleteSelected,
    handleUndo,
    handleRedo,
  } = props;

  // Delete selected blocks
  const handleDeleteKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return; // Allow normal backspace editing in inputs
      }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockIndices.length > 0) {
      e.preventDefault();
      handleDeleteSelected();
    }
  }, [selectedBlockIndices.length, handleDeleteSelected]);

  useEffect(() => {
    document.addEventListener('keydown', handleDeleteKey);
    return () => document.removeEventListener('keydown', handleDeleteKey);
  }, [handleDeleteKey]);

  // Undo/Redo
  const handleUndoRedoKey = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      handleRedo();
    }
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    document.addEventListener('keydown', handleUndoRedoKey);
    return () => document.removeEventListener('keydown', handleUndoRedoKey);
  }, [handleUndoRedoKey]);

  // Command insertion
  const handleCommandKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      console.log('Ctrl+K pressed', { selectedBlockIndices, focusedBlockIndex });
      let insertIndex: number;
      if (selectedBlockIndices.length > 0) {
        const validSelected = selectedBlockIndices.filter((i: number) => i > 0).sort((a, b) => a - b);
        if (validSelected.length > 0) {
          const minIndex = validSelected[0];
          const selectedContent = validSelected.map(idx => blocks[idx].content).join('\n');
          // Set initial pending before insert
          setPendingReplacement({ 
            insertIndex: minIndex, 
            selectedIndices: validSelected, 
            selectedContent, 
            isInitial: true 
          });
          insertBlockAbove(minIndex, 'command');
          // Adjust pending after insert (assuming batch update)
          setPendingReplacement((prev: PendingReplacement | null) => {
            if (!prev || !prev.isInitial) return prev;
            const adjustedSelected = prev.selectedIndices.map((i: number) => i + 1);
            return {
              ...prev,
              selectedIndices: adjustedSelected,
              isInitial: false,
              commandBlockIndex: minIndex
            } as PendingReplacement;
          });
          setSelectedBlockIndices([]);
          setFocusedBlockIndex(minIndex);
          return;
        } else {
          insertIndex = 1;
        }
      } else {
        insertIndex = Math.max(1, focusedBlockIndex);
      }
      insertBlockAbove(insertIndex, 'command');
      setFocusedBlockIndex(insertIndex);
    }
  }, [selectedBlockIndices, focusedBlockIndex, blocks, insertBlockAbove, setPendingReplacement, setSelectedBlockIndices, setFocusedBlockIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleCommandKey);
    return () => document.removeEventListener('keydown', handleCommandKey);
  }, [handleCommandKey]);
};
