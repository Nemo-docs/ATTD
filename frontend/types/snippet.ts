export type Snippet = {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
};

export type CreateSnippetRequest = {
  userId: string;
  content: string;
  tags?: string[];
};

export type UpdateSnippetRequest = {
  content?: string;
  tags?: string[]; // replace tags
  addTags?: string[]; // add tags
};

