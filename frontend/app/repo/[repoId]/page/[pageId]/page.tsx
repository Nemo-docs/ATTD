"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
// import IndexSidebar from "../../component/index_sidebar/index_sidebar";
import { pageApi } from "../../../../../lib/api";
import { Page } from "../../../../../types/page";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SingleLineMarkdownBlock, BlockType } from '../../../../../component/chat/SingleLineMarkdownBlock';
import { useDefinitions } from '../../../../../hooks/useDefinitions';

const AsyncMarkdown = React.memo(({ children, components }: { children: string; components: any }) => {
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

const getMarkdownComponents = () => ({
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match?.[1];

    if (!inline && lang === 'mermaid') {
      return (
        <div className="overflow-x-auto">
          <div className="mermaid-diagram" {...props}>
            {Array.isArray(children) ? children.join('') : children}
          </div>
        </div>
      );
    }

    return !inline && match ? (
      <pre className={`rounded-md p-3 overflow-x-auto text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100`}>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    ) : (
      <code className={`px-1 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100`} {...props}>
        {children}
      </code>
    );
  },
  blockquote({ children, ...props }: any) {
    return (
      <blockquote className={`border-l-4 pl-4 italic border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300`} {...props}>
        {children}
      </blockquote>
    );
  },
  table({ children, ...props }: any) {
    return (
      <div className="overflow-x-auto">
        <table className={`min-w-full border border-gray-200 dark:border-gray-700`} {...props}>
          {children}
        </table>
      </div>
    );
  },
  th({ children, ...props }: any) {
    return (
      <th className={`border px-3 py-2 font-semibold border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100`} {...props}>
        {children}
      </th>
    );
  },
  td({ children, ...props }: any) {
    return (
      <td className={`border px-3 py-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100`} {...props}>
        {children}
      </td>
    );
  },
  ul({ children, ...props }: any) {
    return <ul className="list-disc list-inside space-y-1" {...props}>{children}</ul>;
  },
  ol({ children, ...props }: any) {
    return <ol className="list-decimal list-outside pl-6 space-y-1" {...props}>{children}</ol>;
  },
  li({ children, ...props }: any) {
    return <li className="leading-relaxed break-words" {...props}>{children}</li>;
  },
  h1({ children, ...props }: any) {
    return <h1 className="text-3xl font-bold mb-2" {...props}>{children}</h1>;
  },
  h2({ children, ...props }: any) {
    return <h2 className="text-2xl font-bold mb-2" {...props}>{children}</h2>;
  },
  h3({ children, ...props }: any) {
    return <h3 className="text-xl font-bold mb-1" {...props}>{children}</h3>;
  },
  p({ children, ...props }: any) {
    return <p className="mb-2 leading-relaxed" {...props}>{children}</p>;
  },
  a({ children, href, ...props }: any) {
    return (
      <a href={href} className={`hover:underline text-blue-600 dark:text-blue-400`} {...props}>
        {children}
      </a>
    );
  },
  strong({ children, ...props }: any) {
    return <strong className="font-semibold" {...props}>{children}</strong>;
  },
  em({ children, ...props }: any) {
    return <em className="italic" {...props}>{children}</em>;
  },
  div({ children, className, ...props }: any) {
    if (className?.includes('mermaid')) {
      return (
        <div className="overflow-x-auto">
          <div className="mermaid-diagram" {...props}>
            {children}
          </div>
        </div>
      );
    }
    return <div className={className} {...props}>{children}</div>;
  },
});

interface Block {
  id: string;
  type: BlockType;
  content: string;
}

interface SlashCommand {
  label: string;
  description: string;
  template: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { label: 'h1', description: 'Heading 1', template: '# ' },
  { label: 'h2', description: 'Heading 2', template: '## ' },
  { label: 'h3', description: 'Heading 3', template: '### ' },
  { label: 'text', description: 'Normal text', template: '' },
  { label: 'code', description: 'Code block', template: '```\n\n```' },
  { label: 'list', description: 'Bullet list', template: '- ' },
  { label: 'numbered', description: 'Numbered list', template: '1. ' },
  { label: 'quote', description: 'Block quote', template: '> ' },
  { label: 'table', description: 'Table', template: '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |' },
  { label: 'mermaid', description: 'Mermaid diagram', template: '```mermaid\ngraph TD\n  A[Start] --> B[End]\n```' },
];

export default function PageView() {
  const params = useParams();
  const pageId = params.pageId as string;
  const repoId = params.repoId as string;
  const { findMatches } = useDefinitions(repoId);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(0);
  
  // Refs to track last saved content to avoid unnecessary saves
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef<boolean>(false);
  const blocksRef = useRef<Block[]>([]);
  const currentPageRef = useRef<Page | null>(null);

  useEffect(() => {
    if (pageId) {
      loadPage(pageId);
    }

    // Cleanup auto-save interval on unmount
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [pageId]);


  // Convert markdown content to blocks
  const parseContentToBlocks = (content: string): Block[] => {
    if (!content.trim()) {
      return [{ id: '1', type: 'text', content: '' }];
    }

    const lines = content.split('\n');
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      
      // Handle empty lines - create separate empty text blocks to preserve spacing
      if (line.trim() === '') {
        blocks.push({
          id: `block-${blocks.length + 1}`,
          type: 'text',
          content: ''
        });
        i++;
        continue;
      }

      // Check for headings
      if (line.startsWith('# ')) {
        blocks.push({
          id: `block-${blocks.length + 1}`,
          type: 'h1',
          content: line.substring(2)
        });
        i++;
      } else if (line.startsWith('## ')) {
        blocks.push({
          id: `block-${blocks.length + 1}`,
          type: 'h2',
          content: line.substring(3)
        });
        i++;
      } else if (line.startsWith('### ')) {
        blocks.push({
          id: `block-${blocks.length + 1}`,
          type: 'h3',
          content: line.substring(4)
        });
        i++;
      } else if (line.startsWith('```')) {
        // Handle code blocks - collect all lines until closing ```
        const codeLines: string[] = [];
        i++; // Skip opening ```
        
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        
        blocks.push({
          id: `block-${blocks.length + 1}`,
          type: 'code',
          content: codeLines.join('\n')
        });
        i++; // Skip closing ```
      } else {
        // Regular text line - create a separate block for each line
        // This preserves the original line structure
        blocks.push({
          id: `block-${blocks.length + 1}`,
          type: 'text',
          content: line
        });
        i++;
      }
    }

    return blocks.length > 0 ? blocks : [{ id: '1', type: 'text', content: '' }];
  };

  // Convert blocks to markdown content (excluding title block)
  const blocksToContent = (blocks: Block[]): string => {
    // Skip the first block (title) and convert the rest
    const contentBlocks = blocks.slice(1);
    return contentBlocks.map(block => {
      switch (block.type) {
        case 'h1':
          return `# ${block.content}`;
        case 'h2':
          return `## ${block.content}`;
        case 'h3':
          return `### ${block.content}`;
        case 'code':
          return `\`\`\`\n${block.content}\n\`\`\``;
        default:
          // Empty text blocks should create empty lines
          return block.content;
      }
    }).join('\n'); // Join with single newline to preserve exact spacing
  };

  // Auto-save function that only saves if content changed
  const performAutoSave = async () => {
    // Read latest blocks and page from refs to avoid stale closure issues
    const latestBlocks = blocksRef.current;
    const latestPage = currentPageRef.current;
    if (!latestPage || latestBlocks.length === 0 || isAutoSavingRef.current) return;

    const content = blocksToContent(latestBlocks);
    const title = latestBlocks[0]?.content || '';

    // Check if content or title actually changed
    if (content === lastSavedContentRef.current && title === lastSavedTitleRef.current) {
      return; // No changes, skip save
    }

    try {
      isAutoSavingRef.current = true;
      await pageApi.updatePage(latestPage.id, {
        title,
        content,
      });

      // Update refs without causing re-render
      lastSavedContentRef.current = content;
      lastSavedTitleRef.current = title;
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to auto-save page:', err);
      // Don't set error state for auto-save failures to avoid UI disruption
    } finally {
      isAutoSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (currentPage) {
      // Update currentPage ref
      currentPageRef.current = currentPage;
      
      const parsedBlocks = parseContentToBlocks(currentPage.content);
      // Add title as the first block (h1)
      const titleBlock: Block = {
        id: 'title-block',
        type: 'h1',
        content: currentPage.title,
      };
      const newBlocks = [titleBlock, ...parsedBlocks];
      setBlocks(newBlocks);
      blocksRef.current = newBlocks;
      setFocusedBlockIndex(0);
      
      // Initialize last saved refs
      lastSavedContentRef.current = currentPage.content;
      lastSavedTitleRef.current = currentPage.title;

      // Start auto-save interval (check every 5 seconds)
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      autoSaveIntervalRef.current = setInterval(() => {
        performAutoSave();
      }, 5000);
    } else {
      currentPageRef.current = null;
    }

    // Cleanup interval when component unmounts or page changes
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [currentPage]);

  const loadPage = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await pageApi.getPage(id);
      setCurrentPage(response.page);
    } catch (err) {
      console.error('Failed to load page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentPage || blocks.length === 0) return;

    try {
      setSaving(true);
      const content = blocksToContent(blocks);
      // Get title from the first block
      const title = blocks[0]?.content || '';

      const response = await pageApi.updatePage(currentPage.id, {
        title,
        content,
      });

      // Update refs and state
      lastSavedContentRef.current = content;
      lastSavedTitleRef.current = title;
      // Update blocksRef to match current blocks
      blocksRef.current = blocks;
      setCurrentPage(response.page);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save page:', err);
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  // Block manipulation functions
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

  const handleOverflow = (index: number, overflowText: string) => {
    const currentBlock = blocks[index];
    insertBlock(index, currentBlock.type, overflowText);
  };


  

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    });
  }, []);

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

  if (loading) {
    return (
      <div className="flex min-h-screen font-sans bg-background text-foreground">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading page...</div>
        </main>
      </div>
    );
  }

  if (error || !currentPage) {
    return (
      <div className="flex min-h-screen font-sans bg-background text-foreground">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-destructive">{error || 'Page not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans bg-background text-foreground">
      <main className="flex-1">
        <ScrollArea className="h-full min-h-screen">
          <div className="p-6 max-w-5xl mx-auto">
            <div className="relative">
              {blocks.map((block, index) => {
                // Apply compact spacing while maintaining typography hierarchy
                const getMarginClass = (type: BlockType) => {
                  const spacing = {
                    h1: 'mb-3 mt-3',   // Keep original spacing for headings
                    h2: 'mb-2 mt-2',   // Keep original spacing for headings
                    h3: 'mb-1 mt-1',   // Keep original spacing for headings
                    code: 'mb-2 mt-2',  // Keep original spacing for code
                    text: 'mb-0 mt-0'   // Reduced spacing for text blocks only
                  };
                  return spacing[type] || 'mb-0 mt-0';
                };

                return (
                  <SingleLineMarkdownBlock
                    key={block.id}
                    content={block.content}
                    type={block.type}
                    isFocused={focusedBlockIndex === index}
                    onChange={(content) => updateBlock(index, { content })}
                    onTypeChange={(type) => {
                      // Prevent changing title block type
                      if (index === 0 && type !== 'h1') return;
                      updateBlock(index, { type });
                    }}
                    onFocus={() => setFocusedBlockIndex(index)}
                    onNavigateUp={() => {
                      if (index > 0) {
                        setFocusedBlockIndex(index - 1);
                      }
                    }}
                    onNavigateDown={() => {
                      if (index < blocks.length - 1) {
                        setFocusedBlockIndex(index + 1);
                      }
                    }}
                    onEnter={() => insertBlock(index)}
                    onBackspaceAtStart={() => {
                      if (index > 0) {
                        deleteBlock(index);
                      }
                      // Prevent deleting title block (index 0)
                    }}
                    onOverflow={(overflowText) => handleOverflow(index, overflowText)}
                    className={getMarginClass(block.type)}
                    repoId={repoId}
                    findMatches={findMatches}
                  />
                );
              })}
            </div>
          </div>
        </ScrollArea>
        {/* Floating Save Button */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="shadow-lg"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
