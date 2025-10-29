import { z } from 'zod';
import { Page, CreatePageRequest, UpdatePageRequest } from '../types/page';
import { InlineQnaRequest, InlineQnaResponse } from '../types/inline-qna';
import { ChatRequest, ChatResponse } from '../types/chat';
import { ChatQaRequest, ChatQaResponse, ChatConversationRequest, ChatConversationResponse } from '@/types/chat-qa';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';

// Ensure no trailing slash
const cleanBaseUrl = BACKEND_BASE_URL.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${cleanBaseUrl}/api${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, error);
  }

  return response.json();
}

export const pageApi = {
  // Get all pages
  getAllPages: async (userId: string): Promise<{ pages: Page[]; total_count: number }> => {
    return apiRequest(`/pages/?user_id=${encodeURIComponent(userId)}`);
  },

  // Get a single page by ID
  getPage: async (pageId: string, userId: string): Promise<{ page: Page }> => {
    return apiRequest(`/pages/${pageId}?user_id=${encodeURIComponent(userId)}`);
  },

  // Create a new page
  createPage: async (data: CreatePageRequest): Promise<{ page: Page; message: string }> => {
    return apiRequest('/pages/create', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        content: data.content ?? '',
        user_id: data.userId,
      }),
    });
  },

  // Update a page
  updatePage: async (
    pageId: string,
    userId: string,
    data: UpdatePageRequest
  ): Promise<{ page: Page; message: string }> => {
    return apiRequest(`/pages/${pageId}?user_id=${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: data.title,
        content: data.content,
      }),
    });
  },

  // Delete a page
  deletePage: async (
    pageId: string,
    userId: string
  ): Promise<{ message: string; deleted_page_id: string }> => {
    return apiRequest(`/pages/${pageId}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },
};

export const inlineQnaApi = {
  // Answer a query
  answerQuery: async (data: InlineQnaRequest): Promise<InlineQnaResponse> => {
    return apiRequest('/inline-qna/answer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const chatApi = {
  // Send a chat message
  sendMessage: async (data: ChatRequest): Promise<ChatResponse> => {
    return apiRequest('/chat/message', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get chat history for a page
  getChatHistory: async (pageId: string): Promise<{ messages: ChatResponse[] }> => {
    return apiRequest(`/chat/history/${pageId}`);
  },

  // Create a new conversation
  createConversation: async (data: { title?: string; pageId?: string }): Promise<{ conversationId: string }> => {
    return apiRequest('/chat/conversation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get conversation messages
  getConversation: async (conversationId: string): Promise<{ messages: ChatResponse[] }> => {
    return apiRequest(`/chat/conversation/${conversationId}`);
  },
};

export const chatQaApi = {
  // Send a chat message and get AI response
  sendMessage: async (data: ChatQaRequest & { thinkLevel?: 'simple' | 'detailed' }): Promise<ChatQaResponse> => {
    return apiRequest('/chat-qa/message', {
      method: 'POST',
      body: JSON.stringify({
        message: data.message,
        // backend expects snake_case keys
        conversation_id: (data as any).conversationId ?? (data as any).conversation_id,
        page_id: (data as any).pageId ?? (data as any).page_id,
        diagram_mode: (data as any).diagramMode ?? (data as any).diagram_mode ?? false,
        // include repo hash under the expected key
        repo_hash: (data as any).repoHash ?? (data as any).repo_hash,
        // think level controls how the model reasons: 'simple' or 'detailed'
        think_level: (data as any).thinkLevel ?? (data as any).think_level ?? 'simple',
        user_id: (data as any).userId ?? (data as any).user_id,
      }),
    });
  },

  // Create a new conversation
  createConversation: async (data: ChatConversationRequest): Promise<ChatConversationResponse> => {
    return apiRequest('/chat-qa/conversation', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        page_id: data.pageId,
        user_id: data.userId,
      }),
    });
  },

  // List conversations for a user
  listConversations: async (userId: string): Promise<ChatConversationResponse[]> => {
    return apiRequest(`/chat-qa/conversations?user_id=${encodeURIComponent(userId)}`);
  },

  // List conversations for a page
  // listConversations: async (pageId?: string): Promise<ChatConversationResponse[]> => {
  //   return apiRequest(`/chat-qa/conversations${userId}`);
  // },

  // Get conversation messages
  getConversationMessages: async (
    conversationId: string,
    userId: string
  ): Promise<{ messages: ChatQaResponse[] }> => {
    return apiRequest(`/chat-qa/conversation/${conversationId}?user_id=${encodeURIComponent(userId)}`);
  },

  // Health check for chat QA service
  healthCheck: async (): Promise<{ status: string; service: string; timestamp: string; model: string }> => {
    return apiRequest('/chat-qa/health');
  },
};

export const repoApi = {
  // Create a repo entry and trigger cloning on backend
  createRepo: async (data: { github_url: string }): Promise<{ repo_hash: string; github_url: string; name: string } | { error: string }> => {
    return apiRequest('/git-repo/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Retrieve repository metadata by repo hash
  getRepo: async (
    repoHash: string
  ): Promise<
    {
      repo_hash: string;
      project_intro?: string | null;
      project_data_flow_diagram?: string | null;
      project_cursory_explanation?: string | null;
      github_url?: string | null;
      name?: string | null;
    }
  > => {
    return apiRequest(`/git-repo/${encodeURIComponent(repoHash)}`);
  },
};

const userModelSchema = z.object({
  user_id: z.string().length(16),
  created_at: z.string(),
  updated_at: z.string(),
});

const registerUserResponseSchema = z.object({
  message: z.string(),
  user: userModelSchema,
});

export type RegisterUserResponse = z.infer<typeof registerUserResponseSchema>;

export const userApi = {
  register: async (userId: string): Promise<RegisterUserResponse> => {
    const response = await apiRequest<Record<string, unknown>>('/user/register', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });

    return registerUserResponseSchema.parse(response);
  },
};