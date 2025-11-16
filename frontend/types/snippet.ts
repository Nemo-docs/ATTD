export type Snippet = {
  id: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
};

export type CreateSnippetRequest = {
  content: string;
  tags?: string[];
};

export type UpdateSnippetRequest = {
  content?: string;
  tags?: string[]; // replace tags
  addTags?: string[]; // add tags
};

