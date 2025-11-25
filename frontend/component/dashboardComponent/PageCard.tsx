"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, GitBranch, Trash2 } from "lucide-react";
import type { Page } from "@/types/page";

interface PageCardProps {
  page: Page;
  onDelete: (page: Page) => void;
}

export function PageCard({ page, onDelete }: PageCardProps) {
  const router = useRouter();

  return (
    <div
      className="group relative rounded-md border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04] cursor-pointer"
      onClick={() => router.push(`/repo/${page.repo_hash}/page/${page.id}`)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-row items-center min-w-0 flex-1 justify-center gap-2">
          {/* Icon and page title together in one column */}
          <div className="flex flex-row items-center min-w-0 flex-1 overflow-hidden gap-2">
            <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-mono font-medium text-white truncate flex-1 overflow-hidden text-ellipsis">
              {page.title}
            </h3>
          </div>
          {/* Repo Name column */}
          {page.repo_name && (
            <div className="flex flex-col items-center min-w-0 flex-1 overflow-hidden">
              <span className="text-xs text-gray-400 font-mono whitespace-nowrap overflow-hidden text-ellipsis w-full">
                <span className="flex items-center gap-1"><GitBranch className="h-4 w-4 text-gray-500 flex-shrink-0" />{page.repo_name}</span>
              </span>
            </div>
          )}
          {/* Last updated column */}
          <div className="flex flex-col items-center min-w-0 flex-1 overflow-hidden text-right">
            <p className="text-xs text-gray-500 font-mono whitespace-nowrap overflow-hidden text-ellipsis w-full">
              {new Date(page.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-500 hover:bg-red-500/10 hover:text-red-400 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page);
            }}
            title="Delete page"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
