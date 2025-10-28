export interface Page {
  id: string;
  user_id: string;
  userId?: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePageRequest {
  title: string;
  content?: string;
  userId: string;
}

export interface UpdatePageRequest {
  title?: string;
  content?: string;
  userId?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
