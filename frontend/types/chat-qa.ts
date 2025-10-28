export interface ChatQaRequest {
  message: string;
  conversationId?: string;
  pageId?: string;
  repoHash?: string;
  diagramMode?: boolean;
  thinkLevel?: 'simple' | 'detailed';
  userId: string;
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
  userId?: string;
}

export interface ChatConversationRequest {
  title?: string;
  pageId?: string;
  userId: string;
}

export interface ChatConversationResponse {
  id: string;
  title: string;
  pageId?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ChatQaError {
  error: string;
  details?: string;
}
