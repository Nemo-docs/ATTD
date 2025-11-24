"use client";

import React from "react";
import { useRepoData } from "@/hooks/useRepoData";
// import RepoNavigation from "./RepoNavigation";

interface RepoLayoutProps {
  repoId: string;
  render: (data: any, loading: boolean, errorMessage: string | null) => React.ReactNode;
}

export default function RepoLayout({ repoId, render }: RepoLayoutProps) {
  const { data, loading, errorMessage } = useRepoData(repoId);

  return (
    <div className="relative min-h-screen w-full bg-[#191919] text-white">
      <div className="w-full h-full rounded-lg overflow-hidden">
        {/* Navigation Header */}
        {/* <RepoNavigation repoId={repoId} /> */}

        {/* Main Content */}
        <div className="p-6 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <div className="text-gray-400 font-mono">Loading repository data...</div>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="text-red-400 text-lg mb-2">⚠️ Error</div>
                <div className="text-red-300">{errorMessage}</div>
              </div>
            </div>
          ) : (
            render(data, loading, errorMessage)
          )}
        </div>
      </div>
    </div>
  );
}
