import { useState } from 'react';

export const useBlockSelection = () => {
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(0);
  const [selectedBlockIndices, setSelectedBlockIndices] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);

  // Handle block mouse down for selection
  const handleBlockMouseDown = (index: number, event: React.MouseEvent) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;

    if (isShiftPressed && selectedBlockIndices.length > 0) {
      // Shift+click: select range from last selected to current
      const lastSelected = selectedBlockIndices[selectedBlockIndices.length - 1];
      const start = Math.min(lastSelected, index);
      const end = Math.max(lastSelected, index);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedBlockIndices(range);
      setFocusedBlockIndex(index);
    } else if (isCtrlPressed) {
      // Ctrl+click: toggle selection
      setSelectedBlockIndices(prev => {
        const isSelected = prev.includes(index);
        if (isSelected) {
          return prev.filter(i => i !== index);
        } else {
          return [...prev, index];
        }
      });
      setFocusedBlockIndex(index);
    } else {
      // Regular click: start drag selection or single select
      setDragStartIndex(index);
      setIsDragging(true);
      setSelectedBlockIndices([index]);
      setFocusedBlockIndex(index);
    }
  };

  // Handle mouse enter during drag
  const handleBlockMouseEnter = (index: number) => {
    if (isDragging && dragStartIndex !== null) {
      const start = Math.min(dragStartIndex, index);
      const end = Math.max(dragStartIndex, index);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedBlockIndices(range);
    }
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartIndex(null);
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedBlockIndices([]);
  };

  return {
    focusedBlockIndex,
    setFocusedBlockIndex,
    selectedBlockIndices,
    setSelectedBlockIndices,
    handleBlockMouseDown,
    handleBlockMouseEnter,
    handleMouseUp,
    clearSelection,
  };
};
