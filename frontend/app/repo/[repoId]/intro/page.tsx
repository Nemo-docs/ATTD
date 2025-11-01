"use client";

import React, { use } from "react";
import RepoLayout from "@/component/repo/RepoLayout";
import AsyncMarkdown from "@/component/chat/AsyncMarkdown";
import { getMarkdownComponents } from '@/component/chat/MarkdownComponents';
import { Github, GitBranch } from "lucide-react";

const unwrapFencedContent = (text?: string) => {
  if (!text) return '';
  const fenceRegex = /^(?:```|~~~)[^\n]*\n([\s\S]*?)\n(?:```|~~~)\s*$/;
  const m = text.match(fenceRegex);
  if (m && m[1]) return m[1].trim();
  return text;
};

export default function IntroPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { repoId } = resolvedParams;

  return (
    <div className="max-w-none">
      <RepoLayout repoId={repoId} render={(data) => (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* Repository Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Repository Name */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-5 hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4 text-gray-400" />
                <span className="text-[14px] text-gray-400 font-mono">Repository</span>
              </div>
              <div className="text-[14px] font-mono text-white">
                {(data as any)?.name || 'Unknown'}
              </div>
            </div>

            {/* GitHub URL */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-5 hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Github className="w-4 h-4 text-gray-400" />
                <span className="text-[14px] text-gray-400 font-mono">Source</span>
              </div>
              {(data as any)?.github_url ? (
                <a 
                  href={(data as any).github_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[14px] font-mono text-blue-400 hover:text-blue-300 transition-colors truncate block"
                >
                  {(data as any).github_url}
                </a>
              ) : (
                <span className="text-[14px] text-gray-500 font-mono">Not available</span>
              )}
            </div>
          </div>

          {/* Project Introduction */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
            <div className="prose prose-invert max-w-none">
              <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                {unwrapFencedContent((data as any)?.project_intro) || 'No project introduction available.'}
              </AsyncMarkdown>
            </div>
          </div>
        </div>
      )}
    />
    </div>
  );
}
