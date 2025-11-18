export interface MentionedDefinition {
  node_name: string;
  file_name: string;
  start_end_lines: [number, number];
  node_type: 'file' | 'class' | 'function';
}

export interface InlineQnaRequest {
  query: string;
  page_id: string;
  repo_hash: string;
  mentioned_definitions?: MentionedDefinition[];
}

export interface InlineQnaResponse {
  query: string;
  page_id: string;
  answer: string;
  created_at: string;
}

export interface InlineQnaError {
  error: string;
  details?: string;
}
