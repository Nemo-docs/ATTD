import { z } from 'zod';

// Schema for mentioned definitions
export const mentionedDefinitionSchema = z.object({
  node_name: z.string(),
  file_name: z.string(),
  start_end_lines: z.tuple([z.number(), z.number()]),
  node_type: z.enum(['file', 'class', 'function']),
});

// Schema for inline Q&A request
export const inlineQnaRequestSchema = z.object({
  query: z.string(),
  page_id: z.string(),
  repo_hash: z.string(),
  mentioned_definitions: z.array(mentionedDefinitionSchema).optional(),
});

// Schema for inline Q&A response
export const inlineQnaResponseSchema = z.object({
  query: z.string(),
  page_id: z.string(),
  answer: z.string(),
  created_at: z.string(),
});

// Schema for inline Q&A error
export const inlineQnaErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

// Type exports
export type MentionedDefinition = z.infer<typeof mentionedDefinitionSchema>;
export type InlineQnaRequest = z.infer<typeof inlineQnaRequestSchema>;
export type InlineQnaResponse = z.infer<typeof inlineQnaResponseSchema>;
export type InlineQnaError = z.infer<typeof inlineQnaErrorSchema>;
