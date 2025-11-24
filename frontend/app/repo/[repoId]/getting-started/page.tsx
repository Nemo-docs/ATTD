"use client";

import React from "react";
import RepoLayout from "@/component/repo/RepoLayout";
import AsyncMarkdown from "@/component/chat/AsyncMarkdown";
import { getMarkdownComponents } from '@/component/chat/MarkdownComponents';
import { Github, GitBranch, RefreshCw } from "lucide-react";
import { repoApi } from "@/lib/api";
import { ProjectIntro } from "@/types/repo";
import { ApplicationRepoInfo } from "@/types/repo";
import { LibraryRepoInfo } from "@/types/repo";
import { ServiceRepoInfo } from "@/types/repo";

const unwrapFencedContent = (text?: string) => {
  if (!text) return '';
  const fenceRegex = /^(?:```|~~~)[^\n]*\n([\s\S]*?)\n(?:```|~~~)\s*$/;
  const m = text.match(fenceRegex);
  if (m && m[1]) return m[1].trim();
  return text;
};

export default function GettingStartedPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const { repoId } = resolvedParams;

  return (
    <div className="max-w-none">
      <RepoLayout repoId={repoId} render={(data: ProjectIntro, loading: boolean, errorMessage: string | null) => {
        if (loading || errorMessage || !data.repo_info) {
          return (
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <div className="text-gray-400 font-mono">Loading...</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-red-400">Error loading repository data</div>
              )}
            </div>
          );
        }

        const repoType = data.repo_type;
        const repoInfo = data.repo_info;

        return (
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

            {/* Getting Started Content */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
              <h2 className="text-[24px] font-bold mb-6 font-mono text-center">Getting Started</h2>
              <div className="prose prose-invert max-w-none space-y-8">
                {repoType === 'application' && (
                  <>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((repoInfo as ApplicationRepoInfo).overview) || 'No overview available.'}
                      </AsyncMarkdown>
                    </section>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((repoInfo as ApplicationRepoInfo).setup_and_installation) || 'No setup instructions available.'}
                      </AsyncMarkdown>
                    </section>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((repoInfo as ApplicationRepoInfo).testing) || 'No testing information available.'}
                      </AsyncMarkdown>
                    </section>
                  </>
                )}
                {repoType === 'library' && (
                  <>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((repoInfo as LibraryRepoInfo).purpose) || 'No purpose description available.'}
                      </AsyncMarkdown>
                    </section>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((repoInfo as LibraryRepoInfo).installation) || 'No installation instructions available.'}
                      </AsyncMarkdown>
                    </section>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      {(repoInfo as LibraryRepoInfo).quick_start_examples && (repoInfo as LibraryRepoInfo).quick_start_examples.length > 0 ? (
                        <ul className="space-y-4">
                          {(repoInfo as LibraryRepoInfo).quick_start_examples.map((example, index) => (
                            <li key={index} className="pl-4 border-l-2 border-gray-600">
                              <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                                {unwrapFencedContent(example)}
                              </AsyncMarkdown>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400">No quick start examples available.</p>
                      )}
                    </section>
                  </>
                )}
                {repoType === 'service' && (
                  <>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((repoInfo as ServiceRepoInfo).service_description) || 'No description available.'}
                      </AsyncMarkdown>
                    </section>
                    <section>
                      <h3 className="text-[18px] font-semibold mb-3"></h3>
                      <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {unwrapFencedContent((repoInfo as ServiceRepoInfo).running_locally) || 'No local running instructions available.'}
                      </AsyncMarkdown>
                    </section>
                  </>
                )}
                {repoType !== 'application' && repoType !== 'library' && repoType !== 'service' && (
                  <p className="text-gray-400">Unsupported repository type: {repoType}</p>
                )}
              </div>
            </div>
          </div>
        );
      }} />
    </div>
  );
}
