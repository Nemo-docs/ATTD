import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Block } from '../../types/page-editor';

export const useUndoRedo = (blocks: Block[]) => {
  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  
  const pastRef = useRef(past);
  const futureRef = useRef(future);
  const blocksRef = useRef(blocks);
  
  useEffect(() => {
    pastRef.current = past;
  }, [past]);
  
  useEffect(() => {
    futureRef.current = future;
  }, [future]);
  
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  
  const saveState = useCallback(() => {
    setFuture([]);
    setPast(prevPast => [...prevPast.slice(-19), blocksRef.current]);
  }, []);
  
  const multiUndo = useCallback((n: number): Block[] | null => {
    const currentPast = pastRef.current;
    const currentFuture = futureRef.current;
    const currentBlocks = blocksRef.current;
    
    const effectiveN = Math.min(n, currentPast.length);
    if (effectiveN === 0) return null;
    
    const targetIndex = currentPast.length - effectiveN;
    const targetBlocks = currentPast[targetIndex];
    
    const newPast = currentPast.slice(0, targetIndex);
    const newFuture = [...currentPast.slice(targetIndex + 1), currentBlocks, ...currentFuture];
    
    setPast(newPast);
    setFuture(newFuture);
    
    return targetBlocks;
  }, []);
  
  const undo = useCallback(() => multiUndo(1), [multiUndo]);
  
  const multiRedo = useCallback((n: number): Block[] | null => {
    const currentPast = pastRef.current;
    const currentFuture = futureRef.current;
    const currentBlocks = blocksRef.current;
    
    const effectiveN = Math.min(n, currentFuture.length);
    if (effectiveN === 0) return null;
    
    const targetBlocks = currentFuture[effectiveN - 1];
    
    const newPast = [...currentPast, currentBlocks, ...currentFuture.slice(0, effectiveN - 1)];
    
    const newFuture = currentFuture.slice(effectiveN);
    
    setPast(newPast);
    
    setFuture(newFuture);
    
    return targetBlocks;
  }, []);
  
  const redo = useCallback(() => multiRedo(1), [multiRedo]);
  
  return { saveState, undo, redo, multiUndo, multiRedo };
};
