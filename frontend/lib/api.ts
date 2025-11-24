import { z } from 'zod';
import { useAuth } from '@clerk/nextjs';
import { Page, CreatePageRequest, UpdatePageRequest } from '../types/page';
import { InlineQnaRequest, InlineQnaResponse } from '../types/inline-qna';
import { ChatRequest, ChatResponse } from '../types/chat';
import { ChatQaRequest, ChatQaResponse, ChatConversationRequest, ChatConversationResponse } from '@/types/chat-qa';
import { ProjectIntro } from '@/types/repo';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';

// Ensure no trailing slash
const cleanBaseUrl = BACKEND_BASE_URL.replace(/\/$/, '');

// Authenticated fetch hook using Clerk
export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  return authenticatedFetch;
}

// Global authenticated fetch function (for internal use only)
let globalAuthenticatedFetch: ((url: string, options?: RequestInit) => Promise<Response>) | null = null;

// Hook to initialize the global authenticated fetch
export function useInitializeAuth() {
  const authenticatedFetch = useAuthenticatedFetch();
  globalAuthenticatedFetch = authenticatedFetch;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!globalAuthenticatedFetch) {
    throw new Error('Authentication not initialized. Make sure to call useInitializeAuth() in a component.');
  }

  const url = `${cleanBaseUrl}/api${endpoint}`;
  console.log('url', url);

  const response =
     await globalAuthenticatedFetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })


  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, error);
  }

  return response.json();
}


export const pageApi = {
  // Get all pages
  getAllPages: async (): Promise<{ pages: Page[]; total_count: number }> => {
    return apiRequest('/pages/');
  },

  // Get a single page by ID
  getPage: async (pageId: string): Promise<{ page: Page }> => {
    return apiRequest(`/pages/${pageId}`);
  },

  // Create a new page
  createPage: async (data: CreatePageRequest): Promise<{ page: Page; message: string }> => {
    return apiRequest('/pages/create', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        content: data.content ?? '',
      }),
    });
  },

  // Update a page
  updatePage: async (
    pageId: string,
    data: UpdatePageRequest
  ): Promise<{ page: Page; message: string }> => {
    return apiRequest(`/pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: data.title,
        content: data.content,
      }),
    });
  },

  // Delete a page
  deletePage: async (pageId: string): Promise<{ message: string; deleted_page_id: string }> => {
    return apiRequest(`/pages/${pageId}`, {
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
  sendMessage: async (
    data: ChatQaRequest & { thinkLevel?: 'simple' | 'detailed' }
  ): Promise<ChatQaResponse> => {
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
        mentioned_definations: (data as any).mentionedDefinations ?? (data as any).mentioned_definations,
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
      }),
    });
  },

  // List conversations for the authenticated user
  listConversations: async (): Promise<ChatConversationResponse[]> => {
    return apiRequest('/chat-qa/conversations');
  },


  // Get conversation messages
  getConversationMessages: async (
    conversationId: string
  ): Promise<{ messages: ChatQaResponse[] }> => {
    return apiRequest(`/chat-qa/conversation/${conversationId}`);
  },

  // Health check for chat QA service
  healthCheck: async (): Promise<{ status: string; service: string; timestamp: string; model: string }> => {
    return apiRequest('/chat-qa/health');
  },
};

export const repoApi = {
  // Create a repo entry and trigger cloning on backend
  createRepo: async (
    data: { github_url: string }
  ): Promise<{ repo_hash: string; github_url: string; name: string } | { error: string }> => {
    return apiRequest('/git-repo/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Retrieve repository metadata by repo hash
  getRepo: async (repoHash: string): Promise<ProjectIntro> => {
    return apiRequest<ProjectIntro>(`/git-repo/${encodeURIComponent(repoHash)}`);
  },

  // Update repository from GitHub
  updateRepo: async (data: { github_url: string }): Promise<{ up_to_date: boolean }> => {
    return apiRequest('/git-repo-update/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  listRepos: async (): Promise<ProjectIntro[]> => {
    return apiRequest('/git-repo-list');
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

// API Key types
export interface APIKeyCreateRequest {
  name: string;
  description?: string;
}

export interface APIKeyPlaintextResponse {
  api_key: string;
}

export interface APIKeySummary {
  key_prefix: string;
  name: string;
  description?: string;
}

export interface APIKeyRevokeResponse {
  revoked: boolean;
}

export const keyApi = {
  // Create a new API key
  createKey: async (data: APIKeyCreateRequest): Promise<APIKeyPlaintextResponse> => {
    return apiRequest('/keys/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // List all active API keys
  listKeys: async (): Promise<APIKeySummary[]> => {
    return apiRequest('/keys/list');
  },

  // Revoke an API key
  revokeKey: async (keyPrefix: string): Promise<APIKeyRevokeResponse> => {
    return apiRequest(`/keys/revoke/${keyPrefix}`, {
      method: 'PUT',
    });
  },
};

const mermaidValidationResponseSchema = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
});

export type MermaidValidationResponse = z.infer<typeof mermaidValidationResponseSchema>;

export const autoGenerationApi = {
  // Get definitions for a repository
  getDefinitions: async (repoHash: string): Promise<any[]> => {
    return apiRequest(`/auto-generation/definitions/${encodeURIComponent(repoHash)}`);
  },
};

export const mermaidApi = {
  /**
   * Validate Mermaid diagram syntax
   * @param mermaidCode The Mermaid diagram code to validate
   * @returns Validation result with isValid flag and optional error message
   */
  validate: async (mermaidCode: string): Promise<MermaidValidationResponse> => {
    // Call Next.js API route directly (not backend API)
    const frontendUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${frontendUrl}/api/mermaid/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mermaidCode }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiError(response.status, errorText);
    }

    const result = await response.json();
    return mermaidValidationResponseSchema.parse(result);
  },
};

export { globalAuthenticatedFetch };