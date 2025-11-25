"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GitBranch, ExternalLink, Bookmark, PlusCircle } from "lucide-react";
import type { ProjectIntro } from "@/types/repo";

interface RepositoryCardProps {
  repo: ProjectIntro;
  isMine: boolean;
  viewMode: 'all' | 'my';
  onAdd: (repo: ProjectIntro) => void;
  onRemove: (repo: ProjectIntro) => void;
  onCreatePage: (repo: ProjectIntro) => void;
}

export function RepositoryCard({ repo, isMine, viewMode, onAdd, onRemove, onCreatePage }: RepositoryCardProps) {
  const router = useRouter();
  const showAddButton = viewMode === 'all' && !isMine;
  const showRemoveButton = isMine;

  return (
    <div
      className="group relative rounded-md border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04] cursor-pointer"
      onClick={() => router.push(`/repo/${repo.repo_hash}/getting-started`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Repository Name */}
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <h3 className="text-xl font-mono font-medium text-white truncate">
              {repo.name}
            </h3>
            {isMine && (
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium bg-white/5 text-gray-300 rounded-sm">
                Added
              </span>
            )}
          </div>

          {/* Repository URL */}
          <a
            href={repo.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1 mb-4 font-mono text-[14px]"
          >
            <span className="truncate">{repo.github_url}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="font-mono text-[12px] text-gray-600">
            {/* Could add timestamp if available */}
          </div>
          <div className="flex gap-1 opacity-0 transition-opacity opacity-100">
            {showAddButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-500 hover:bg-white/10 hover:text-white rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(repo);
                }}
                title="Add to my repositories"
              >
                <Bookmark className="size-3.5" />
              </Button>
            )}
            {showRemoveButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-500 hover:bg-white/10 hover:text-white rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(repo);
                }}
                title="Remove from my repositories"
              >
                <Bookmark className="size-3.5 fill-current" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-500 hover:bg-white/10 hover:text-white rounded"
              onClick={(e) => {
                e.stopPropagation();
                onCreatePage(repo);
              }}
              title="Create new page for this repo"
            >
              <PlusCircle className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
