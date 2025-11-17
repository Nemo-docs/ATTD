import { BlockType } from '../component/chat/SingleLineMarkdownBlock';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
}

export interface SlashCommand {
  label: string;
  description: string;
  template: string;
}

export interface CommandState {
  loading: boolean;
  error: string | null;
  insertedCount?: number;
}
