"use client";

import { Loader2 } from "lucide-react";
import { PageCard } from "./PageCard";
import type { Page } from "@/types/page";

interface PageListProps {
  pagesLoading: boolean;
  displayedPages: Page[];
  onDelete: (page: Page) => void;
  pageSearchTerm: string;
}

export function PageList({ 
  pagesLoading, 
  displayedPages, 
  onDelete, 
  pageSearchTerm 
}: PageListProps) {
  if (pagesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-gray-500 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading pages...</p>
        </div>
      </div>
    );
  }

  if (displayedPages.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
        <p className="font-mono text-[14px] text-gray-600">
          {pageSearchTerm
            ? `No pages found for "${pageSearchTerm}".`
            : 'No pages yet.'
          }
        </p>
        {pageSearchTerm && (
          <p className="text-gray-500 text-sm mt-2 font-mono text-[14px]">
            Clear the search to see all pages.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedPages.map((page) => (
        <PageCard 
          key={page.id}
          page={page}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
