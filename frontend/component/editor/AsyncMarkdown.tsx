import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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

export const getMarkdownComponents = () => ({
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

export default AsyncMarkdown;
