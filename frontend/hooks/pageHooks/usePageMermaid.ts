import { useEffect } from 'react';
import mermaid from 'mermaid';
import { Block } from '../../types/page-editor';

export const usePageMermaid = (blocks: Block[]) => {
  // Initialize mermaid for diagram rendering
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    });
  }, []);

  // Render mermaid diagrams when blocks change
  useEffect(() => {
    const renderDiagrams = async () => {
      const diagrams = document.querySelectorAll('.mermaid-diagram');
      for (const diagram of diagrams) {
        const code = diagram.textContent || '';
        if (code.trim() && !diagram.querySelector('svg')) {
          try {
            const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code.trim());
            diagram.innerHTML = svg;
          } catch (error) {
            console.warn('Failed to render mermaid diagram:', error);
            diagram.innerHTML = `<pre class="text-red-500">Failed to render diagram</pre>`;
          }
        }
      }
    };

    const timeoutId = setTimeout(renderDiagrams, 100);
    return () => clearTimeout(timeoutId);
  }, [blocks]);
};
