import React, { useCallback } from 'react';
import { Block } from '../../types/page-editor';
import { parseContentToBlocks, htmlToMarkdown } from '../../component/editor/blockUtils';

interface UsePasteHandlerProps {
  blocks: Block[];
  updateBlock: (index: number, updates: Partial<Block>) => void;
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  setFocusedBlockIndex: (index: number) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  saveState: () => void;
}

export const usePasteHandler = ({
  blocks,
  updateBlock,
  setBlocks,
  setFocusedBlockIndex,
  setHasUnsavedChanges,
  saveState,
}: UsePasteHandlerProps) => {
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
  }, [blocks, updateBlock, setBlocks, setFocusedBlockIndex, setHasUnsavedChanges, saveState]);

  return { handlePaste };
};
