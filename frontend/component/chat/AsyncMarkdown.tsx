'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

interface AsyncMarkdownProps {
  children: string;
  components?: Components;
  isUser: boolean;
}

// Async Markdown component to handle mermaid and other remark plugins.
// Avoid re-stringifying the AST back to markdown because that can alter
// list structure and cause bullet/numbered lists to render incorrectly.
// Instead forward the original markdown to ReactMarkdown and let it apply
// remark plugins directly. We still detect raw HTML/SVG/mermaid markers to
// enable rehype-raw when necessary.
const AsyncMarkdown = React.memo(({ children, components, isUser }: AsyncMarkdownProps) => {
  const [processedContent, setProcessedContent] = useState<string>(children);
  const [containsRawHtml, setContainsRawHtml] = useState<boolean>(false);

  useEffect(() => {
    setProcessedContent(children);
    setContainsRawHtml(/<svg[\s\S]*?>/i.test(children));
  }, [children]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={containsRawHtml ? [rehypeRaw] : []}
      components={components}
      skipHtml={!containsRawHtml}
    >
      {processedContent}
    </ReactMarkdown>
  );
});

AsyncMarkdown.displayName = 'AsyncMarkdown';

export default AsyncMarkdown;
