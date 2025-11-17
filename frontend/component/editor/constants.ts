import { SlashCommand } from '../../types/page-editor';

export const SLASH_COMMANDS: SlashCommand[] = [
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
