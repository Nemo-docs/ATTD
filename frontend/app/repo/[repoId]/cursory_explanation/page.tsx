"use client";

import React, { use } from "react";
import RepoLayout from "@/component/repo/RepoLayout";
import AsyncMarkdown from "@/component/chat/AsyncMarkdown";
import { getMarkdownComponents } from '@/component/chat/MarkdownComponents';

const makeCodeBlock = (text?: string) => {
  if (!text) return '';
  return ['```text', text, '```'].join('\n');
};

export default function CursoryExplanationPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const { repoId } = resolvedParams;

  return (
    <div className="max-w-none">
      <RepoLayout repoId={repoId} render={(data) => (
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
              <div className="prose prose-invert max-w-none">
                <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                  {makeCodeBlock((data as any)?.project_cursory_explanation) || 'No project overview available.'}
                </AsyncMarkdown>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
