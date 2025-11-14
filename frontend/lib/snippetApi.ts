import { z } from "zod";
import {
  createSnippetRequestSchema,
  createSnippetResponseSchema,
  getSnippetsResponseSchema,
  getSnippetResponseSchema,
  deleteSnippetResponseSchema,
} from "./snippetSchema";
import type { CreateSnippetRequest, UpdateSnippetRequest, Snippet } from "../types/snippet";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8000";
const cleanBaseUrl = BACKEND_BASE_URL.replace(/\/$/, "");

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${cleanBaseUrl}/api${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const text = await response.text().catch(() => "");
  if (!response.ok) {
    throw new ApiError(response.status, text || "Unknown error");
  }
  const data = text ? JSON.parse(text) : {};
  return data as T;
}

export const snippetApi = {
  getAllSnippets: async (userId: string): Promise<{ snippets: Snippet[]; total_count: number }> => {
    const res = await apiRequest(`/snippets/?user_id=${encodeURIComponent(userId)}`);
    console.log("getAllSnippets res", res);
    const parsed = getSnippetsResponseSchema.parse(res);
    const normalizedSnippets = parsed.snippets.map((s: any) => ({
      id: s.id,
      userId: s.user_id ?? s.userId,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    }));

    return { ...parsed, snippets: normalizedSnippets };
  },

  ensureCollection: async (userId: string): Promise<{ message: string }> => {
    const res = await apiRequest(`/snippets/ensure_collection?user_id=${encodeURIComponent(userId)}`, {
      method: "POST",
    });
    return res as { message: string };
  },

  getSnippet: async (snippetId: string, userId: string): Promise<{ snippet: Snippet }> => {
    const res = await apiRequest(`/snippets/${encodeURIComponent(snippetId)}?user_id=${encodeURIComponent(userId)}`);
    const parsed = getSnippetResponseSchema.parse(res);
    const s: any = parsed.snippet;
    const normalizedSnippet = {
      id: s.id,
      userId: s.user_id ?? s.userId,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    };

    return { ...parsed, snippet: normalizedSnippet };
  },

  createSnippet: async (data: CreateSnippetRequest): Promise<{ snippet: Snippet; message: string }> => {
    const parsed = createSnippetRequestSchema.parse(data);
    const res = await apiRequest("/snippets/create", {
      method: "POST",
      body: JSON.stringify({
        user_id: parsed.userId,
        content: parsed.content,
        tags: parsed.tags ?? [],
      }),
    });
    const parsedResponse = createSnippetResponseSchema.parse(res);
    const s: any = parsedResponse.snippet;
    const normalizedSnippet = {
      id: s.id,
      userId: s.user_id ?? s.userId,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    };

    return { ...parsedResponse, snippet: normalizedSnippet };
  },

  updateSnippet: async (snippetId: string, userId: string, data: UpdateSnippetRequest): Promise<{ snippet: Snippet; message: string }> => {
    const body: any = {};
    if (data.content !== undefined) body.content = data.content;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.addTags !== undefined) body.add_tags = data.addTags;

    const res = await apiRequest(`/snippets/${encodeURIComponent(snippetId)}?user_id=${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const parsed = createSnippetResponseSchema.parse(res);
    const s: any = parsed.snippet;
    const normalizedSnippet = {
      id: s.id,
      userId: s.user_id ?? s.userId,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    };
    const message = (parsed as any).message ?? "";
    return { snippet: normalizedSnippet, message };
  },

  deleteSnippet: async (snippetId: string, userId: string): Promise<{ message: string; deleted_snippet_id: string }> => {
    const res = await apiRequest(`/snippets/${encodeURIComponent(snippetId)}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    return deleteSnippetResponseSchema.parse(res);
  },
};


