"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, GitBranch, ExternalLink, Plus, Trash2, LayoutDashboard, NotepadText, Loader2, Globe, User, FileText, Bookmark, MoveUpRight, PlusCircle } from "lucide-react";
import Link from 'next/link';
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { repoApi } from "@/lib/api";
import { userApi, type UserRepoInfo } from "@/lib/userApi";
import { pageApi } from "@/lib/api";
import type { ProjectIntro } from "@/types/repo";
import type { Page } from "@/types/page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RepositoryList } from "@/component/dashboardComponent/RepositoryList";
import { PageList } from "@/component/dashboardComponent/PageList";
import { CloneDialog } from "@/component/dashboardComponent/CloneDialog";
import { CreatePageDialog } from "@/component/dashboardComponent/CreatePageDialog";
import { useDashboardData } from "@/hooks/dashboardHooks/useDashboardData";


export default function DashboardPage() {
    const router = useRouter();
    const { repositories, myRepoInfos, myHashes, pages, loading, pagesLoading, handleAdd, handleRemove, handleDeletePage, refetch } = useDashboardData();
    const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
    const [repoSearchTerm, setRepoSearchTerm] = useState("");
    const [pageSearchTerm, setPageSearchTerm] = useState("");
    const [currentView, setCurrentView] = useState<'repositories' | 'pages'>('repositories');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [githubUrl, setGithubUrl] = useState("");
    const [cloning, setCloning] = useState(false);
    const [cloneError, setCloneError] = useState<string | null>(null);
    const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [selectedRepo, setSelectedRepo] = useState<ProjectIntro | null>(null);


    useEffect(() => {
        refetch();
    }, []);

    const handleClone = async () => {
      if (!githubUrl) return;
      setCloning(true);
      setCloneError(null);
      try {
        const res = await repoApi.createRepo({ github_url: githubUrl });
        // Refetch data to update the list
        refetch();
        setIsDialogOpen(false);
        setGithubUrl("");
      } catch (err) {
        console.error(err);
        setCloneError((err as any).message ?? String(err));
      } finally {
        setCloning(false);
      }
    };

    const displayedRepositories = repositories.filter(repo =>
        repo.name.toLowerCase().includes(repoSearchTerm.toLowerCase()) &&
        (viewMode === 'all' || myHashes.has(repo.repo_hash))
    );

    const displayedPages = pages.filter(page =>
      page.title.toLowerCase().includes(pageSearchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#191919] text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 text-gray-500 animate-spin" />
                    <p className="text-gray-500 text-sm font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#191919] text-white">
            <div className="mx-auto max-w-6xl px-6 py-12">
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="font-mono text-[24px] font-medium tracking-tight">Dashboard</h1>
                        <p className="mt-1 text-[14px] text-gray-500">
                            Explore and manage your repositories and pages
                        </p>
                    </div>
                </div>

                {/* Main View Tabs */}
                <div className="mb-8">
                    <div className="inline-flex rounded-md border border-white/5 bg-white/[0.02] overflow-hidden">
                        <button
                            onClick={() => setCurrentView('repositories')}
                            className={`h-9 gap-2 px-4 font-mono text-[14px] text-white transition-colors flex items-center ${
                                currentView === 'repositories'
                                    ? 'bg-white/10 hover:bg-white/15'
                                    : 'bg-transparent hover:bg-white/5 text-gray-500 hover:text-white'
                            }`}
                        >
                            <LayoutDashboard className="size-4" />
                            Repositories
                        </button>
                        <button
                            onClick={() => setCurrentView('pages')}
                            className={`h-9 gap-2 px-4 font-mono text-[14px] text-white transition-colors flex items-center ${
                                currentView === 'pages'
                                    ? 'bg-white/10 hover:bg-white/15'
                                    : 'bg-transparent hover:bg-white/5 text-gray-500 hover:text-white'
                            }`}
                        >
                            <FileText className="size-4" />
                            Notes
                        </button>
                        <Link
                            href="/snippets"
                            className="h-9 gap-2 px-4 font-mono text-[14px] text-white transition-colors hover:bg-white/15 flex items-center bg-transparent hover:bg-white/5 text-gray-500 hover:text-white"
                        >
                            <NotepadText className="size-4" />
                            My Snippets
                            <MoveUpRight className="size-3" />
                        </Link>
                    </div>
                </div>

                {/* Controls Section */}
                {currentView === 'repositories' ? (
                  <div className="mb-8">
                    <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
                      <div className="flex-1 max-w-md">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-600" />
                          <Input
                            className="h-10 rounded-md border-white/5 bg-white/5 pl-10 font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
                            placeholder="Search repositories..."
                            value={repoSearchTerm}
                            onChange={(e) => setRepoSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                      <Select value={viewMode} onValueChange={(value: string) => setViewMode(value as 'all' | 'my')}>
                        <SelectTrigger className="w-[180px] h-10 rounded-md border-white/5 bg-white/5 px-3 font-mono text-[14px] text-white focus-visible:ring-0 focus-visible:ring-0">
                          <SelectValue placeholder="View Mode" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#191919] border-white/10 text-white min-w-[180px]">
                          <SelectItem value="all" className="font-mono text-[14px]">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              All Public
                            </div>
                          </SelectItem>
                          <SelectItem value="my" className="font-mono text-[14px]">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              My Repositories
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8">
                    {/* Search Bar for Pages */}
                    <div className="max-w-md mx-auto">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-600" />
                        <Input
                          className="h-10 rounded-md border-white/5 bg-white/5 pl-10 font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
                          placeholder="Search pages..."
                          value={pageSearchTerm}
                          onChange={(e) => setPageSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Repository List */}
                {currentView === 'repositories' ? (
                  <>
                    <RepositoryList 
                      displayedRepositories={displayedRepositories}
                      myHashes={myHashes}
                      viewMode={viewMode}
                      onAdd={handleAdd}
                      onRemove={handleRemove}
                      onCreatePage={(repo) => {
                        setSelectedRepo(repo);
                        setNewPageTitle(`New Page - ${repo.name}`); // wait, newPageTitle is in component now, so remove
                        setIsTitleDialogOpen(true);
                      }}
                    />
                    {displayedRepositories.length === 0 && (
                      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
                        <button
                          className="group inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4 hover:bg-white/10 transition-all duration-200 hover:scale-110"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <Plus className="w-8 h-8 text-white group-hover:text-white transition-colors" />
                        </button>
                        <p className="font-mono text-[14px] text-gray-600">
                          {repoSearchTerm
                            ? `No repositories found for "${repoSearchTerm}".`
                            : viewMode === 'my'
                              ? (
                                  <>
                                    No repositories added yet. Switch to{' '}
                                    <span
                                      onClick={() => setViewMode('all')}
                                      className="underline cursor-pointer text-blue-400 hover:text-blue-300"
                                    >
                                      All Public
                                    </span>{' '}
                                    to explore.
                                  </>
                                )
                              : 'No repositories found.'
                          }
                        </p>
                        {repoSearchTerm && (
                          <p className="text-gray-500 text-sm mt-2 font-mono text-[14px]">
                            Click the + to clone a new repository.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <PageList 
                    pagesLoading={pagesLoading}
                    displayedPages={displayedPages}
                    onDelete={handleDeletePage}
                    pageSearchTerm={pageSearchTerm}
                  />
                )}

                {/* Footer info */}
                {(currentView === 'repositories' ? displayedRepositories : displayedPages).length > 0 && (
                    <div className="mt-8 text-center text-sm text-gray-500 font-mono text-[14px]">
                        Showing {(currentView === 'repositories' ? displayedRepositories : displayedPages).length} {currentView === 'repositories' ? (displayedRepositories.length === 1 ? 'repository' : 'repositories') : (displayedPages.length === 1 ? 'page' : 'pages')}
                    </div>
                )}
            </div>
            <CloneDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onCloneSuccess={refetch} />

            <CreatePageDialog isOpen={isTitleDialogOpen} onOpenChange={setIsTitleDialogOpen} selectedRepo={selectedRepo} />
        </div>
    );
}
