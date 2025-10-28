import { useEffect } from 'react';

interface UseCtrlPOptions {
  onPress: () => void;
}

export function useCtrlP({ onPress }: UseCtrlPOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl+P is pressed
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault(); // Prevent default browser behavior (print dialog)
        onPress();
      }
    };

    // Add event listener to document to catch Ctrl+P globally
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onPress]);
}
