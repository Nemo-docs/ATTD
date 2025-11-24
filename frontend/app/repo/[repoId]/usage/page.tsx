"use client";

import React, { use } from "react";
import { useRepoData } from "@/hooks/useRepoData";
// import RepoNavigation from "@/component/repo/RepoNavigation";
import AsyncMarkdown from "@/component/chat/AsyncMarkdown";
import { getMarkdownComponents } from '@/component/chat/MarkdownComponents';
import { ProjectIntro } from "@/types/repo";

export default function UsagePage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
    const resolvedParams = params instanceof Promise ? use(params) : params;
    const { repoId } = resolvedParams;

    const { data, loading, errorMessage } = useRepoData(repoId);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#191919]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <div className="text-gray-400 font-mono">Loading usage information...</div>
                </div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#191919]">
                <div className="text-center">
                    <div className="text-red-400 text-lg mb-2">⚠️ Error</div>
                    <div className="text-red-300">{errorMessage}</div>
                </div>
            </div>
        );
    }

    const usageInfo = (data as ProjectIntro)?.repo_info?.p3_info;

    if (!usageInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#191919]">
                <div className="text-center text-gray-400 font-mono">
                    No usage information available
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#191919] text-white">
            {/* <RepoNavigation repoId={repoId} /> */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="prose prose-invert max-w-none bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
                    <h1 className="text-[24px] font-bold mb-6 font-mono text-center">Usage & API Reference</h1>
                    <AsyncMarkdown components={getMarkdownComponents(false)} isUser={false}>
                        {usageInfo}
                    </AsyncMarkdown>
                </div>
            </div>
        </div>
    );
}
