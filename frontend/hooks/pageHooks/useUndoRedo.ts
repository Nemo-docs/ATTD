import React, { useState, useCallback } from 'react';
import { Block } from '../../types/page-editor';

export const useUndoRedo = (blocks: Block[]) => {
  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);

  const saveState = useCallback(() => {
    setFuture([]);
    setPast(prev => [...prev.slice(-19), blocks]);
  }, [blocks]);

  const undo = useCallback(() => {
    if (past.length === 0) return null;
    const previousBlocks = past[past.length - 1];
    const newPast = past.slice(0, -1);
    setFuture(prev => [blocks, ...prev]);
    setPast(newPast);
    return previousBlocks;
  }, [past, blocks]);

  const redo = useCallback(() => {
    if (future.length === 0) return null;
    const nextBlocks = future[0];
    const newFuture = future.slice(1);
    setPast(prev => [...prev, blocks]);
    setFuture(newFuture);
    return nextBlocks;
  }, [future, blocks]);

  return { saveState, undo, redo };
};
