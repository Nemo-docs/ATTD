import { useState, useRef } from 'react';
import { Block } from '../../types/page-editor';
import { BlockType } from '../../component/chat/SingleLineMarkdownBlock';

export const useBlockManagement = (
  initialBlocks: Block[] = [],
  setHasUnsavedChanges: (value: boolean) => void,
  setFocusedBlockIndex: (index: number) => void
) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const blocksRef = useRef<Block[]>(initialBlocks);

  // Update block content or type
  const updateBlock = (index: number, updates: Partial<Block>) => {
    setBlocks(prev => {
      const newBlocks = prev.map((block, i) =>
        i === index ? { ...block, ...updates } : block
      );
      blocksRef.current = newBlocks; // Update ref with latest blocks
      return newBlocks;
    });
    setHasUnsavedChanges(true);
  };

  // Insert a new block below the specified index
  const insertBlock = (index: number, type: BlockType = 'text', content: string = '') => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content,
    };
    setBlocks(prev => {
      const newBlocks = [
        ...prev.slice(0, index + 1),
        newBlock,
        ...prev.slice(index + 1)
      ];
      blocksRef.current = newBlocks; // Update ref with latest blocks
      return newBlocks;
    });
    setFocusedBlockIndex(index + 1);
    setHasUnsavedChanges(true);
  };

  // Insert a new block above the specified index
  const insertBlockAbove = (index: number, type: BlockType = 'text', content: string = '') => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content,
    };

    setBlocks(prev => {
      const targetIndex = Math.max(0, index);
      const newBlocks = [
        ...prev.slice(0, targetIndex),
        newBlock,
        ...prev.slice(targetIndex),
      ];
      blocksRef.current = newBlocks;
      return newBlocks;
    });
    setFocusedBlockIndex(Math.max(0, index));
    setHasUnsavedChanges(true);
  };

  // Delete a block at the specified index
  const deleteBlock = (index: number) => {
    if (index === 0) return; // Prevent deleting title block
    if (blocks.length <= 1) return; // Keep at least one block

    setBlocks(prev => {
      const newBlocks = prev.filter((_, i) => i !== index);
      blocksRef.current = newBlocks; // Update ref with latest blocks
      return newBlocks;
    });
    setFocusedBlockIndex(Math.max(0, Math.min(index, blocks.length - 2)));
    setHasUnsavedChanges(true);
  };

  // Handle overflow text by creating a new block
  const handleOverflow = (index: number, overflowText: string) => {
    const currentBlock = blocks[index];
    insertBlock(index, currentBlock.type, overflowText);
  };

  // Insert multiple blocks below the specified index
  const insertBlocksBelow = (index: number, payloads: Array<{ type: BlockType; content: string }>) => {
    if (payloads.length === 0) return;
    setBlocks(prev => {
      const newBlockEntries = payloads.map(payload => ({
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...payload,
      }));
      const newBlocks = [
        ...prev.slice(0, index + 1),
        ...newBlockEntries,
        ...prev.slice(index + 1),
      ];
      blocksRef.current = newBlocks;
      return newBlocks;
    });
    setHasUnsavedChanges(true);
  };

  return {
    blocks,
    setBlocks,
    blocksRef,
    updateBlock,
    insertBlock,
    insertBlockAbove,
    deleteBlock,
    handleOverflow,
    insertBlocksBelow,
  };
};
