"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, GitBranch, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { repoApi } from "@/lib/api";
import { userApi, type UserRepoInfo } from "@/lib/userApi";
import type { ProjectIntro } from "@/types/repo";

export default function DashboardPage() {
    const router = useRouter();
    const [repositories, setRepositories] = useState<ProjectIntro[]>([]);
    const [myRepoInfos, setMyRepoInfos] = useState<UserRepoInfo[]>([]);
    const [myHashes, setMyHashes] = useState(new Set<string>());
    const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [data, infos] = await Promise.all([
                    repoApi.listRepos(),
                    userApi.getMyRepoInfos()
                ]);
                setRepositories(data);
                setMyRepoInfos(infos);
                setMyHashes(new Set(infos.map((info: UserRepoInfo) => info.repo_hash)));
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAdd = async (repo: ProjectIntro) => {
        if (myHashes.has(repo.repo_hash)) return;
        try {
            await userApi.addRepoInfo({
                repo_hash: repo.repo_hash,
                repo_name: repo.name,
                repo_url: repo.github_url
            });
            setMyHashes(prev => new Set([...prev, repo.repo_hash]));
        } catch (error) {
            console.error("Failed to add repo:", error);
        }
    };

    const handleRemove = async (repo: ProjectIntro) => {
        if (!myHashes.has(repo.repo_hash)) return;
        try {
            await userApi.removeRepoInfo({
                repo_hash: repo.repo_hash
            });
            setMyHashes(prev => {
                const newSet = new Set(prev);
                newSet.delete(repo.repo_hash);
                return newSet;
            });
            setMyRepoInfos(prev => prev.filter(info => info.repo_hash !== repo.repo_hash));
        } catch (error) {
            console.error("Failed to remove repo:", error);
        }
    };

    const displayedRepositories = repositories.filter(repo =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (viewMode === 'all' || myHashes.has(repo.repo_hash))
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-400 text-sm font-medium">Loading repositories...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#191919] text-zinc-100">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-700/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative container mx-auto px-6 py-12 max-w-6xl">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-3">
                        {/* <Sparkles className="w-8 h-8 text-zinc-400" /> */}
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                            Dashboard
                        </h1>
                    </div>
                    <p className="text-zinc-400 text-lg">Explore and manage your repositories</p>
                </div>

                {/* Controls Section */}
                <div className="mb-8 space-y-6">
                    {/* View Mode Toggle */}
                    <div className="inline-flex gap-1 p-1 bg-zinc-800/60 backdrop-blur-sm rounded-lg border border-zinc-700/60">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'all'
                                ? 'bg-zinc-700/50 text-zinc-100 shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            All Public
                        </button>
                        <button
                            onClick={() => setViewMode('my')}
                            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'my'
                                ? 'bg-zinc-700/50 text-zinc-100 shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            My Repositories
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="max-w-md mx-auto relative group">
                        <Search className="pointer-events-none z-10 absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-200 h-5 w-5 transition-colors group-focus-within:text-zinc-300" />
                        <input
                            type="text"
                            placeholder="Search repositories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/60 rounded-lg text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-600/60 focus:border-zinc-600 transition-all"
                        />
                    </div>
                </div>

                {/* Repository List */}
                <div className="space-y-4">
                    {displayedRepositories.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-700/60 mb-4">
                                <GitBranch className="w-8 h-8 text-zinc-600" />
                            </div>
                            <p className="text-zinc-400 text-lg">
                                {viewMode === 'my'
                                    ? 'No repositories added yet. Switch to "All Public" to explore.'
                                    : 'No repositories found.'}
                            </p>
                        </div>
                    ) : (
                        displayedRepositories.map((repo) => {
                            const isMine = myHashes.has(repo.repo_hash);
                            const showAddButton = viewMode === 'all' && !isMine;
                            const showRemoveButton = isMine;

                            return (
                                <div
                                    key={repo.repo_hash}
                                    className="group relative bg-zinc-800/40 backdrop-blur-sm border border-zinc-700/60 rounded-xl p-6 hover:bg-zinc-800/60 hover:border-zinc-600/70 transition-all duration-300 cursor-pointer"
                                    onClick={() => router.push(`/repo/${repo.repo_hash}/getting-started`)}
                                >
                                    {/* Subtle gradient overlay on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-700/10 via-zinc-700/20 to-zinc-700/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />

                                    <div className="relative flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Repository Name */}
                                            <div className="flex items-center gap-3 mb-2">
                                                <GitBranch className="h-5 w-5 text-zinc-500 flex-shrink-0" />
                                                <h3 className="text-xl font-semibold text-zinc-100 truncate">
                                                    {repo.name}
                                                </h3>
                                                {isMine && (
                                                    <span className="px-2.5 py-0.5 text-xs font-medium bg-zinc-600/60 text-zinc-200 rounded-full">
                                                        Added
                                                    </span>
                                                )}
                                            </div>

                                            {/* Repository URL */}
                                            <a
                                                href={repo.github_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors inline-flex items-center gap-1 mb-4"
                                            >
                                                <span className="truncate">{repo.github_url}</span>
                                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                            </a>

                                            {/* Repository Type */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="px-3 py-1 bg-zinc-700/60 text-zinc-300 rounded-md font-mono text-xs">
                                                    {repo.repo_type}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 flex-shrink-0">
                                            {showAddButton && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAdd(repo);
                                                    }}
                                                    className="p-2.5 bg-zinc-700/60 hover:bg-zinc-600/70 text-zinc-300 hover:text-zinc-100 rounded-lg transition-all duration-200 hover:scale-105"
                                                    title="Add to my repositories"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            )}
                                            {showRemoveButton && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemove(repo);
                                                    }}
                                                    className="p-2.5 bg-zinc-800/70 hover:bg-zinc-700/90 text-zinc-200 hover:text-white rounded-lg transition-all duration-200 hover:scale-105"
                                                    title="Remove from my repositories"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer info */}
                {displayedRepositories.length > 0 && (
                    <div className="mt-8 text-center text-sm text-zinc-500">
                        Showing {displayedRepositories.length} {displayedRepositories.length === 1 ? 'repository' : 'repositories'}
                    </div>
                )}
            </div>
        </div>
    );
}
