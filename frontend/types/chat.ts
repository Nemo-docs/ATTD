export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  pageId?: string;
  conversationId?: string;
  diagramMode?: boolean;
}

export interface ChatRequest {
  message: string;
  pageId?: string;
  conversationId?: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  role: 'assistant';
  timestamp: Date;
  conversationId?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface ChatState {
  messages: ChatMessage[];
  currentConversation: ChatConversation | null;
  isLoading: boolean;
  error: string | null;
}
