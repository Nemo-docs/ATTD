import { z } from "zod";

export const createSnippetRequestSchema = z.object({
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export const snippetSchema = z.object({
  id: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createSnippetResponseSchema = z.object({
  snippet: snippetSchema,
  message: z.string(),
});



export const getSnippetsResponseSchema = z.object({
  snippets: z.array(snippetSchema),
  total_count: z.number(),
});

export const getSnippetResponseSchema = z.object({
  snippet: snippetSchema,
});

export const deleteSnippetResponseSchema = z.object({
  message: z.string(),
  deleted_snippet_id: z.string(),
});


