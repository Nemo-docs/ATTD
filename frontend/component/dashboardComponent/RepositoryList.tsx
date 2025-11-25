"use client";

import { RepositoryCard } from "./RepositoryCard";
import type { ProjectIntro } from "@/types/repo";

interface RepositoryListProps {
  displayedRepositories: ProjectIntro[];
  myHashes: Set<string>;
  viewMode: 'all' | 'my';
  onAdd: (repo: ProjectIntro) => void;
  onRemove: (repo: ProjectIntro) => void;
  onCreatePage: (repo: ProjectIntro) => void;
}

export function RepositoryList({ 
  displayedRepositories, 
  myHashes, 
  viewMode, 
  onAdd, 
  onRemove, 
  onCreatePage 
}: RepositoryListProps) {
  // if (displayedRepositories.length === 0) {
  //   return (
  //     <div className="rounded-md border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
  //       <p className="font-mono text-[14px] text-gray-600">
  //         No repositories found.
  //       </p>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-3">
      {displayedRepositories.map((repo) => {
        const isMine = myHashes.has(repo.repo_hash);
        return (
          <RepositoryCard 
            key={repo.repo_hash}
            repo={repo}
            isMine={isMine}
            viewMode={viewMode}
            onAdd={onAdd}
            onRemove={onRemove}
            onCreatePage={onCreatePage}
          />
        );
      })}
    </div>
  );
}
