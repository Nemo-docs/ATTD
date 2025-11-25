export interface Page {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  repo_hash?: string;
  repo_name?: string;
}

export interface CreatePageRequest {
  title: string;
  content?: string;
  repo_hash?: string;
  repo_name?: string;
}

export interface UpdatePageRequest {
  title?: string;
  content?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
