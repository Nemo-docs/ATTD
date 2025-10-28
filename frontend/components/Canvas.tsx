import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { pageApi } from '@/lib/api';
import { resolveUserId } from '@/lib/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';

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
    return <h1 className="text-xl font-bold mb-2" {...props}>{children}</h1>;
  },
  h2({ children, ...props }: any) {
    return <h2 className="text-lg font-bold mb-2" {...props}>{children}</h2>;
  },
  h3({ children, ...props }: any) {
    return <h3 className="text-base font-bold mb-1" {...props}>{children}</h3>;
  },
  h4({ children, ...props }: any) {
    return <h4 className="text-sm font-bold mb-1" {...props}>{children}</h4>;
  },
  h5({ children, ...props }: any) {
    return <h5 className="text-xs font-bold mb-1" {...props}>{children}</h5>;
  },
  h6({ children, ...props }: any) {
    return <h6 className="text-xs font-semibold mb-1" {...props}>{children}</h6>;
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

export type CanvasHandle = {
  appendLine: (text: string) => void;
};

type Props = {
  initial?: string;
  title?: string;
  onClose?: () => void;
};

const Canvas = forwardRef<CanvasHandle, Props>(({ initial = '', title = 'Canvas', onClose }, ref) => {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [pageName, setPageName] = useState(title || 'Untitled Page');
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => ({
    appendLine: (text: string) => {
      setContent(prev => {
        const newContent = prev ? `${prev}\n\n---\n\n${text}` : text;
        return newContent;
      });
      // automatically switch to preview so the user sees the rendered content
      setMode('preview');
    },
  }));

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

    // Only attempt rendering when we're in preview mode. This ensures toggling
    // between edit/preview re-triggers rendering even if `content` hasn't changed.
    if (mode !== 'preview') return;

    const timeoutId = setTimeout(renderDiagrams, 100);
    return () => clearTimeout(timeoutId);
  }, [content, mode]);

  // Open the name dialog when user clicks Save
  const handleSave = () => {
    setPageName(title || 'Untitled Page');
    setNameDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    const name = (pageName || '').trim() || 'Untitled Page';
    setSaving(true);
    try {
      const userId = resolveUserId();

      await pageApi.createPage({ title: name, content, userId });
      // show saved dialog with confetti
      setNameDialogOpen(false);
      setSavedDialogOpen(true);
      setShowConfetti(true);
      // auto-dismiss confetti and dialog after a short delay
      window.setTimeout(() => {
        setShowConfetti(false);
      }, 2200);
      window.setTimeout(() => {
        setSavedDialogOpen(false);
        if (onClose) onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Failed to create page', err);
      // show a simple error dialog
      window.alert('Failed to save page: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (onClose) return onClose();
    // Fallback: clear content
    setContent('');
  };

  // small confetti particles rendered when saved
  const Confetti = () => {
    const colors = ['#F97316', '#F43F5E', '#60A5FA', '#A78BFA', '#34D399'];
    return (
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
        <div className="relative w-full h-40">
          {Array.from({ length: 18 }).map((_, i) => {
            const left = Math.round(Math.random() * 100);
            const size = 6 + Math.round(Math.random() * 10);
            const delay = (Math.random() * 0.6).toFixed(2);
            const color = colors[i % colors.length];
            return (
              <span
                key={i}
                style={{
                  left: `${left}%`,
                  width: size,
                  height: size,
                  background: color,
                  animationDelay: `${delay}s`,
                }}
                className={`absolute rounded-sm animate-fall transform-gpu`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // small CSS for confetti animation via utility classes fallback
  useEffect(() => {
    // ensure keyframes are present by injecting a style tag once
    const id = 'canvas-confetti-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1 } 100% { transform: translateY(160px) rotate(360deg); opacity: 0 } } .animate-fall { animation: fall 1.8s cubic-bezier(.2,.8,.2,1) both; }`;
    document.head.appendChild(style);
  }, []);

  // Focus the name input when the name dialog opens
  useEffect(() => {
    if (nameDialogOpen) {
      // wait a tick so the input is mounted inside the dialog
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 0);
    }
  }, [nameDialogOpen]);

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground min-h-0">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[24px]">{title}</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} className="text-[14px] font-mono">
              {saving ? 'Saving...' : 'Save'}
            </Button>

            <Button variant="ghost" onClick={handleClose} className="text-[14px] font-mono">
              Close
            </Button>
          </div>
        </div>

        {/* Small segmented toggle (Edit / Preview) */}
        <div className="mt-2">
          <div className="relative inline-flex items-center bg-border rounded-full h-7 w-auto">
            {/* sliding indicator */}
            <div
              className={`absolute left-0 top-0 h-7 w-1/2 bg-foreground rounded-full transition-transform duration-150 ${
                mode === 'preview' ? 'translate-x-full' : 'translate-x-0'
              }`}
              aria-hidden
            />

            <button
              onClick={() => setMode('edit')}
              className={`relative z-10 w-1/2 text-[12px] font-mono h-7 flex items-center justify-center px-3 rounded-full ${
                mode === 'edit' ? 'text-background' : 'text-foreground/70'
              }`}
              aria-pressed={mode === 'edit'}
              title="Switch to edit"
            >
              Edit
            </button>

            <button
              onClick={() => setMode('preview')}
              className={`relative z-10 w-1/2 text-[12px] font-mono h-7 flex items-center justify-center px-3 rounded-full ${
                mode === 'preview' ? 'text-background' : 'text-foreground/70'
              }`}
              aria-pressed={mode === 'preview'}
              title="Switch to preview"
            >
              Preview
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full min-h-0">
          <div className="p-4 h-full">
            <div className="flex flex-col h-full gap-4">
              {mode === 'edit' ? (
                <Textarea
                  value={content}
                  onChange={(e: any) => setContent(e.target.value)}
                  className="w-full h-1/2 min-h-[160px] resize-y bg-background text-foreground font-mono text-[14px]"
                  placeholder="Write markdown here..."
                />
              ) : (
                <div className="flex-1 overflow-auto p-2 border border-border rounded">
                  <AsyncMarkdown components={getMarkdownComponents()}>
                    {content}
                  </AsyncMarkdown>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
      {/* Name Dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="bg-background text-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Save Page</DialogTitle>
            <DialogDescription>Choose a name for your page before saving.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Input
              ref={nameInputRef}
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmSave();
                }
              }}
              className="bg-background text-foreground placeholder:text-muted-foreground border border-border"
            />
          </div>

          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setNameDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved Dialog */}
      <Dialog open={savedDialogOpen} onOpenChange={setSavedDialogOpen}>
        <DialogContent className="bg-background text-foreground border border-border">
          <div className="relative">
            <DialogHeader>
              <DialogTitle>Saved! Nice work 🎉</DialogTitle>
              <DialogDescription>Ctrl+p to access it now</DialogDescription>
            </DialogHeader>

            {showConfetti && <Confetti />}

            <DialogFooter>
              <Button onClick={() => setSavedDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;
