import { Block } from '../../types/page-editor';
import { BlockType } from '../chat/SingleLineMarkdownBlock';

// Convert markdown content to blocks
export const parseContentToBlocks = (content: string): Block[] => {
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
export const blocksToContent = (blocks: Block[]): string => {
  // Skip the first block (title) and convert the rest
  const contentBlocks = blocks.slice(1).filter(block => block.type !== 'command');
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

// Convert HTML to markdown for paste handling
export const htmlToMarkdown = (html: string): string => {
  let md = html;

  // Handle headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');

  // Handle paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');

  // Handle bold and strong
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');

  // Handle italic and em
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');

  // Handle inline code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Handle code blocks (pre > code)
  md = md.replace(/<pre><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```');
  // Fallback for pre without code
  md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```');

  // Handle line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');

  // Clean up extra whitespace
  md = md.replace(/\n\s*\n\s*\n/g, '\n\n'); // Limit consecutive newlines

  return md.trim();
};