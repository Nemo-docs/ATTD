"use client";

import React, { use, useState } from "react";
import RepoLayout from "@/component/repo/RepoLayout";
import AsyncMarkdown from "@/component/chat/AsyncMarkdown";
import { getMarkdownComponents } from '@/component/chat/MarkdownComponents';
import { Github, GitBranch, RefreshCw } from "lucide-react";
import { repoApi } from "@/lib/api";

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
