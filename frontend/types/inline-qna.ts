export interface InlineQnaRequest {
  text: string;
  cursor_position: { x: number; y: number };
  page_id: string;
}

export interface InlineQnaResponse {
  text: string;
  cursor_position: { x: number; y: number };
  page_id: string;
  answer: string;
  created_at: string;
}

export interface InlineQnaError {
  error: string;
  details?: string;
}
