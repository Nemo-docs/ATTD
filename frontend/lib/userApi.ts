import { apiRequest } from './api';
import { ProjectIntro } from '../types/repo';

export interface UserRepoInfo {
  repo_hash: string;
  repo_name: string;
  repo_url: string;
}

export interface UserGetRepoInfosResponse {
  repo_infos: UserRepoInfo[];
}

export interface AddRepoInfoRequest {
  repo_hash: string;
  repo_name: string;
  repo_url: string;
}

export interface AddRepoInfoResponse {
  completed: boolean;
}

export interface RemoveRepoInfoRequest {
  repo_hash: string;
}

export interface RemoveRepoInfoResponse {
  completed: boolean;
}

export const userApi = {
  getMyRepoInfos: async (): Promise<UserRepoInfo[]> => {
    const res = await apiRequest<UserGetRepoInfosResponse>('/user/get-user-added-repo-infos');
    return res.repo_infos;
  },

  addRepoInfo: async (data: AddRepoInfoRequest): Promise<AddRepoInfoResponse> => {
    return apiRequest('/user/add-repo-info', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  removeRepoInfo: async (data: RemoveRepoInfoRequest): Promise<RemoveRepoInfoResponse> => {
    return apiRequest('/user/remove-repo-info', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};