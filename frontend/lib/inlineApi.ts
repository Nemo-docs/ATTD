import { InlineQnaRequest, InlineQnaResponse } from '../types/inline-qna';
import { inlineQnaResponseSchema } from './inlineSchema';
import { apiRequest } from './api';

export const inlineQnaApi = {
  // Answer an inline query
  answerQuery: async (data: InlineQnaRequest): Promise<InlineQnaResponse> => {
    return apiRequest('/inline-qna/answer', {
      method: 'POST',
      body: JSON.stringify({
        query: data.query,
        // backend expects snake_case keys
        page_id: data.page_id,
        repo_hash: data.repo_hash,
        mentioned_definitions: data.mentioned_definitions,
      }),
    });
  },
};
