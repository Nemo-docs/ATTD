import type { Components } from 'react-markdown';
import MermaidDiagram from '@/component/repo/MermaidDiagram';

/**
 * Provides custom styled components for react-markdown.
 * React-markdown handles the markdown parsing; we provide the presentation layer.
 * 
 * @param isUser - Whether this is a user message (affects color scheme)
 * @returns Components object for react-markdown
 */
export const getMarkdownComponents = (isUser: boolean = false): Components => ({
  // Code blocks with mermaid support
  code(props: any) {
    const inline = !!props?.inline;
    const className = props?.className as string | undefined;
    const children = props?.children as any;
    const match = /language-(\w+)/.exec(className || '');
    const lang = match?.[1];

    // Mermaid diagrams - render using MermaidDiagram component
    if (!inline && lang === 'mermaid') {
      let diagramCode = Array.isArray(children) ? children.join('\n') : String(children || '');
      // Strip any potential markdown fence markers to ensure clean diagram code
      diagramCode = diagramCode
        .trim()
        .replace(/^```mermaid\s*\n?/, '')
        .replace(/\n?```\s*$/, '')
        .trim();
      return (
        <div className="my-4">
          <MermaidDiagram 
            diagram={diagramCode} 
            title="Embedded Diagram" 
            fullSize={false} 
            enableDialog={true}
          />
        </div>
      );
    }

    // Block code with syntax highlighting styles
    if (!inline && match) {
      return (
        <pre className={`rounded-md p-3 overflow-x-auto text-xs font-mono ${
          isUser
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}>
          <code className={className}>
            {children}
          </code>
        </pre>
      );
    }

    // Inline code
    return (
      <code className={`px-1 py-0.5 rounded text-xs font-mono break-words ${
        isUser
          ? 'bg-primary-foreground/20 text-primary-foreground'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`}>
        {children}
      </code>
    );
  },

  // Headings with improved hierarchy and spacing
  h1({ children }) {
    return <h1 className="mt-6 mb-4 text-2xl font-bold leading-tight">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mt-5 mb-3 text-xl font-bold leading-tight">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mt-4 mb-3 text-lg font-semibold leading-tight">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="mt-3 mb-2 text-base font-semibold leading-tight">{children}</h4>;
  },
  h5({ children }) {
    return <h5 className="mt-3 mb-2 text-sm font-semibold leading-tight">{children}</h5>;
  },
  h6({ children }) {
    return <h6 className="mt-3 mb-2 text-sm font-medium leading-tight">{children}</h6>;
  },

  // Paragraphs with 14px body text
  p({ children }) {
    return <p className="mb-3 text-sm leading-relaxed break-words">{children}</p>;
  },

  // Lists
  ul({ children }) {
    return <ul className="list-disc list-outside ml-6 pl-2 space-y-2 mb-3">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-outside ml-6 pl-2 space-y-2 mb-3">{children}</ol>;
  },
  li({ children, ...props }) {
    return (
      <li className="leading-relaxed break-words ml-0 pl-1 text-sm">
        {children}
      </li>
    );
  },

  // Blockquotes
  blockquote({ children }) {
    return (
      <blockquote className={`border-l-4 pl-4 italic my-4 text-sm ${
        isUser
          ? 'border-primary-foreground/30 text-primary-foreground/80'
          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
      }`}>
        {children}
      </blockquote>
    );
  },

  // Tables
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4">
        <table className={`min-w-full border text-sm ${
          isUser
            ? 'border-primary-foreground/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className={`border px-3 py-2 font-semibold ${
        isUser
          ? 'border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`}>
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className={`border px-3 py-2 ${
        isUser
          ? 'border-primary-foreground/20 text-primary-foreground'
          : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
      }`}>
        {children}
      </td>
    );
  },

  // Links
  a({ children, href }) {
    return (
      <a href={href} className={`hover:underline text-sm ${
        isUser
          ? 'text-primary-foreground underline-offset-2'
          : 'text-blue-600 dark:text-blue-400'
      }`}>
        {children}
      </a>
    );
  },

  // Text formatting
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
});
