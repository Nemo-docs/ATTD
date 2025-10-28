import { useEffect } from 'react';

interface UseCtrlKOptions {
  onPress: (position: { x: number; y: number; element: Element | null }) => void;
}

export function useCtrlK({ onPress }: UseCtrlKOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl+K is pressed
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault(); // Prevent default browser behavior

        // Capture cursor position at the exact moment Ctrl+K is pressed
        const position = getCurrentCursorPosition();
        onPress(position);
      }
    };

    // Add event listener to document to catch Ctrl+K globally
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onPress]);
}

function getCurrentCursorPosition() {
  const activeElement = document.activeElement;

  // For contentEditable elements (like TipTap editor)
  if (activeElement && activeElement instanceof HTMLElement && activeElement.contentEditable === 'true') {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Only return position if we have a valid rectangle
      if (rect.width > 0 || rect.height > 0) {
        return {
          x: rect.left,
          y: rect.top - 8, // Position above cursor with small gap
          element: activeElement
        };
      }
    }
  }

  // For input and textarea elements
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const input = activeElement as HTMLInputElement | HTMLTextAreaElement;

    try {
      // Use the browser's built-in selection API
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.width > 0 || rect.height > 0) {
          return {
            x: rect.left,
            y: rect.top - 8, // Position above cursor with small gap
            element: activeElement
          };
        }
      }
    } catch (error) {
      console.warn('Failed to get cursor position for input:', error);
    }
  }

  // Fallback: center of screen if no valid cursor found
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    element: null
  };
}
