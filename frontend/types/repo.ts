export interface BaseRepoInfo {
  p2_info: string;
  p3_info: string;
}

export interface ApplicationRepoInfo extends BaseRepoInfo {
  overview: string;
  setup_and_installation: string;
  testing: string;
}

export interface LibraryRepoInfo extends BaseRepoInfo {
  purpose: string;
  installation: string;
  quick_start_examples: string[];
}

export interface ServiceRepoInfo extends BaseRepoInfo {
  service_description: string;
  running_locally: string;
}

export type RepoInfo = ApplicationRepoInfo | LibraryRepoInfo | ServiceRepoInfo;

export interface ProjectIntro {
  repo_path: string;
  repo_hash: string;
  repo_type: 'application' | 'library' | 'service';
  repo_info: RepoInfo;
  github_url: string;
  name: string;
  created_at: string;
  updated_at: string;
}
