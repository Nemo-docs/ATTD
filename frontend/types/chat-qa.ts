export interface ChatQaRequest {
  message: string;
  conversationId?: string;
  pageId?: string;
  repoHash?: string;
  diagramMode?: boolean;
  thinkLevel?: 'simple' | 'detailed';
  mentionedDefinations?: Array<{node_name: string, file_name: string, start_end_lines: number[], node_type: 'file' | 'class' | 'function'}>;
}

export interface ChatQaResponse {
  id: string;
  message: string;
  response: string;
  conversationId?: string;
  pageId?: string;
  diagramMode?: boolean;
  modelUsed: string;
  tokensUsed: number;
  createdAt: string;
}

export interface ChatConversationRequest {
  title?: string;
  pageId?: string;
}

export interface ChatConversationResponse {
  id: string;
  title: string;
  pageId?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatQaError {
  error: string;
  details?: string;
}
