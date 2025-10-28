// Custom markdown components with proper styling
export const getMarkdownComponents = (isUser: boolean) => ({
  // Code blocks. Render mermaid code blocks as a `.mermaid-diagram` div so
  // the client-side mermaid renderer (initialized in an effect) can find
  // and convert them to SVG. Keep other code block rendering unchanged.
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match?.[1];

    if (!inline && lang === 'mermaid') {
      // Render the raw mermaid code inside a wrapper div. The mermaid
      // rendering effect looks for `.mermaid-diagram` elements and will
      // convert the text content to an SVG.
      return (
        <div className="overflow-x-auto">
          <div className="mermaid-diagram" {...props}>
            {Array.isArray(children) ? children.join('') : children}
          </div>
        </div>
      );
    }

    return !inline && match ? (
      <pre className={`rounded-md p-3 overflow-x-auto text-xs font-mono ${
        isUser
          ? 'bg-primary-foreground/20 text-primary-foreground'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`}>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    ) : (
      <code className={`px-1 py-0.5 rounded text-xs font-mono ${
        isUser
          ? 'bg-primary-foreground/20 text-primary-foreground'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`} {...props}>
        {children}
      </code>
    );
  },
  // Blockquotes
  blockquote({ children, ...props }: any) {
    return (
      <blockquote className={`border-l-4 pl-4 italic ${
        isUser
          ? 'border-primary-foreground/30 text-primary-foreground/80'
          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
      }`} {...props}>
        {children}
      </blockquote>
    );
  },
  // Tables
  table({ children, ...props }: any) {
    return (
      <div className="overflow-x-auto">
        <table className={`min-w-full border ${
          isUser
            ? 'border-primary-foreground/20'
            : 'border-gray-200 dark:border-gray-700'
        }`} {...props}>
          {children}
        </table>
      </div>
    );
  },
  th({ children, ...props }: any) {
    return (
      <th className={`border px-3 py-2 font-semibold ${
        isUser
          ? 'border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`} {...props}>
        {children}
      </th>
    );
  },
  td({ children, ...props }: any) {
    return (
      <td className={`border px-3 py-2 ${
        isUser
          ? 'border-primary-foreground/20 text-primary-foreground'
          : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
      }`} {...props}>
        {children}
      </td>
    );
  },
  // Lists
  ul({ children, ...props }: any) {
    return <ul className="list-disc list-inside space-y-1" {...props}>{children}</ul>;
  },
  ol({ children, ...props }: any) {
    // Use outside markers with padding so numbers align and don't wrap onto their own line
    return <ol className="list-decimal list-outside pl-6 space-y-1" {...props}>{children}</ol>;
  },
  li({ children, ...props }: any) {
    // Allow long lines to break and keep relaxed line-height for readability
    return <li className="leading-relaxed break-words" {...props}>{children}</li>;
  },
  // Headings
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
  // Paragraphs
  p({ children, ...props }: any) {
    return <p className="mb-2 leading-relaxed" {...props}>{children}</p>;
  },
  // Links
  a({ children, href, ...props }: any) {
    return (
      <a href={href} className={`hover:underline ${
        isUser
          ? 'text-primary-foreground underline-offset-2'
          : 'text-blue-600 dark:text-blue-400'
      }`} {...props}>
        {children}
      </a>
    );
  },
  // Strong and emphasis
  strong({ children, ...props }: any) {
    return <strong className="font-semibold" {...props}>{children}</strong>;
  },
  em({ children, ...props }: any) {
    return <em className="italic" {...props}>{children}</em>;
  },
  // Mermaid diagrams
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
