import { useEffect } from 'react';
import mermaid from 'mermaid';

export const useMermaid = (messages: any[], canvasOpen: boolean) => {
  // Initialize mermaid for diagram rendering
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    });
  }, []);

  // Render mermaid diagrams when messages or canvas open state change.
  // We include `canvasOpen` so opening/closing the canvas triggers a
  // re-scan of `.mermaid-diagram` nodes (necessary because the canvas
  // mounts/unmounts its own mermaid container). We also skip nodes that
  // already contain an SVG to avoid re-rendering and flicker.
  useEffect(() => {
    const renderDiagrams = async () => {
      const diagrams = document.querySelectorAll('.mermaid-diagram');
      console.log('useMermaid: Found', diagrams.length, 'mermaid diagrams to render');

      for (const diagram of diagrams) {
        // Skip if already rendered
        if (diagram.querySelector('svg')) {
          console.log('useMermaid: Skipping already rendered diagram');
          continue;
        }

        const code = diagram.textContent || '';
        console.log('useMermaid: Rendering diagram with code:', code.substring(0, 100) + '...');

        if (code.trim()) {
          try {
            const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code.trim());
            diagram.innerHTML = svg;
            console.log('useMermaid: Successfully rendered diagram');
          } catch (error) {
            console.warn('Failed to render mermaid diagram:', error);
            // leave the code text visible for debugging
          }
        }
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(renderDiagrams, 200);
    return () => clearTimeout(timeoutId);
  }, [messages, canvasOpen]);
};
