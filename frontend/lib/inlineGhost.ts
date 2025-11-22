import { apiRequest } from '@/lib/api';

export interface AutocompleteRequest {
  pre_context: string;
  post_context: string;
}

export interface AutocompleteResponse {
  suggestion: string;
}

export const inlineGhostApi = {
  autocomplete: async (data: AutocompleteRequest, opts?: RequestInit): Promise<AutocompleteResponse> => {
    return apiRequest('/autocompletion/ghost', {
      method: 'POST',
      body: JSON.stringify({
        pre_context: data.pre_context,
        post_context: data.post_context,
      }),
      ...(opts ?? {}),
    });
  },
};