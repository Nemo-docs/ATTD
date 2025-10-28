// import { useState, useEffect } from 'react';

// interface CursorPosition {
//   x: number;
//   y: number;
//   element: Element | null;
// }

// export function useCursorPosition() {
//   const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0, element: null });

//   useEffect(() => {
//     const updateCursorPosition = () => {
//       const activeElement = document.activeElement;

//       // For contentEditable elements (like TipTap editor)
//       if (activeElement && activeElement instanceof HTMLElement && activeElement.contentEditable === 'true') {
//         const selection = window.getSelection();
//         if (selection && selection.rangeCount > 0) {
//           const range = selection.getRangeAt(0);

//           // Get the bounding rectangle of the cursor
//           const rect = range.getBoundingClientRect();

//           // Only update if we have a valid rectangle
//           if (rect.width > 0 || rect.height > 0) {
//             setCursorPosition({
//               x: rect.left,
//               y: rect.top - 8, // Position above cursor with small gap
//               element: activeElement
//             });
//             return;
//           }
//         }
//       }

//       // For input and textarea elements
//       if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
//         const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
//         const start = input.selectionStart || 0;
//         const end = input.selectionEnd || 0;

//         if (start === end) {
//           try {
//             // Use the browser's built-in selection API
//             const selection = window.getSelection();
//             if (selection && selection.rangeCount > 0) {
//               const range = selection.getRangeAt(0);
//               const rect = range.getBoundingClientRect();

//               if (rect.width > 0 || rect.height > 0) {
//                 setCursorPosition({
//                   x: rect.left,
//                   y: rect.top - 8, // Position above cursor with small gap
//                   element: activeElement
//                 });
//                 return;
//               }
//             }
//           } catch (error) {
//             console.warn('Failed to get cursor position for input:', error);
//           }
//         }
//       }

//       // Fallback: center of screen if no valid cursor found
//       setCursorPosition({
//         x: window.innerWidth / 2,
//         y: window.innerHeight / 2,
//         element: null
//       });
//     };

//     // Update position immediately
//     updateCursorPosition();

//     // Listen for selection changes (cursor movement, text input, etc.)
//     const handleSelectionChange = () => {
//       updateCursorPosition();
//     };

//     // Listen for focus changes
//     const handleFocus = () => {
//       updateCursorPosition();
//     };

//     // Listen for input events (typing)
//     const handleInput = () => {
//       updateCursorPosition();
//     };

//     // Listen for keyup events (cursor movement with arrow keys)
//     const handleKeyUp = () => {
//       updateCursorPosition();
//     };

//     // Listen for mouse clicks (to update position when clicking in text)
//     const handleMouseUp = () => {
//       updateCursorPosition();
//     };

//     document.addEventListener('selectionchange', handleSelectionChange);
//     document.addEventListener('focus', handleFocus, true);
//     document.addEventListener('input', handleInput, true);
//     document.addEventListener('keyup', handleKeyUp);
//     document.addEventListener('mouseup', handleMouseUp);

//     return () => {
//       document.removeEventListener('selectionchange', handleSelectionChange);
//       document.removeEventListener('focus', handleFocus, true);
//       document.removeEventListener('input', handleInput, true);
//       document.removeEventListener('keyup', handleKeyUp);
//       document.removeEventListener('mouseup', handleMouseUp);
//     };
//   }, []);

//   return cursorPosition;
// }
