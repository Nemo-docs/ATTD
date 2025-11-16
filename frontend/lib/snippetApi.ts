import { z } from "zod";
import {
  createSnippetRequestSchema,
  createSnippetResponseSchema,
  getSnippetsResponseSchema,
  getSnippetResponseSchema,
  deleteSnippetResponseSchema,
} from "./snippetSchema";
import type { CreateSnippetRequest, UpdateSnippetRequest, Snippet } from "../types/snippet";
import {  apiRequest} from "./api";

// Authenticated fetch hook using Clerk
export function useAuthenticatedFetch() {
  const { getToken } = require('@clerk/nextjs');

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

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}


export const snippetApi = {
  getAllSnippets: async (): Promise<{ snippets: Snippet[]; total_count: number }> => {
    const res = await apiRequest(`/snippets/`);
    console.log("getAllSnippets res", res);
    const parsed = getSnippetsResponseSchema.parse(res);
    const normalizedSnippets = parsed.snippets.map((s: any) => ({
      id: s.id,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    }));

    return { ...parsed, snippets: normalizedSnippets };
  },

  ensureCollection: async (
  ): Promise<{ message: string }> => {
    const res = await apiRequest(`/snippets/ensure_collection`, {
      method: "POST",
    });
    return res as { message: string };
  },

  getSnippet: async (
    snippetId: string,
  ): Promise<{ snippet: Snippet }> => {
    const res = await apiRequest(`/snippets/${encodeURIComponent(snippetId)}`);
    const parsed = getSnippetResponseSchema.parse(res);
    const s: any = parsed.snippet;
    const normalizedSnippet = {
      id: s.id,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    };

    return { ...parsed, snippet: normalizedSnippet };
  },

  createSnippet: async (
    data: CreateSnippetRequest,
  ): Promise<{ snippet: Snippet; message: string }> => {
    const parsed = createSnippetRequestSchema.parse(data);
    const res = await apiRequest("/snippets/create", {
      method: "POST",
      body: JSON.stringify({
        content: parsed.content,
        tags: parsed.tags ?? [],
      }),
    });
    const parsedResponse = createSnippetResponseSchema.parse(res);
    const s: any = parsedResponse.snippet;
    const normalizedSnippet = {
      id: s.id,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    };

    return { ...parsedResponse, snippet: normalizedSnippet };
  },

  updateSnippet: async (
    snippetId: string,
    data: UpdateSnippetRequest,
  ): Promise<{ snippet: Snippet; message: string }> => {
    const body: any = {};
    if (data.content !== undefined) body.content = data.content;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.addTags !== undefined) body.add_tags = data.addTags;

    const res = await apiRequest(`/snippets/${encodeURIComponent(snippetId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const parsed = createSnippetResponseSchema.parse(res);
    const s: any = parsed.snippet;
    const normalizedSnippet = {
      id: s.id,
      content: s.content,
      tags: s.tags,
      createdAt: s.created_at ?? s.createdAt,
      updatedAt: s.updated_at ?? s.updatedAt,
    };
    const message = (parsed as any).message ?? "";
    return { snippet: normalizedSnippet, message };
  },

  deleteSnippet: async (
    snippetId: string,
  ): Promise<{ message: string; deleted_snippet_id: string }> => {
    const res = await apiRequest(`/snippets/${encodeURIComponent(snippetId)}`, {
      method: "DELETE",
    });
    return deleteSnippetResponseSchema.parse(res);
  },
};


