"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Building2, Notebook, Plus, Loader2, AlertCircle, ChevronRight } from "lucide-react";

import { pageApi, chatQaApi } from "@/lib/api";
import { resolveUserId } from "@/lib/user";
import { Page } from "@/types/page";

export function SlidingSidebar() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const repoParam = params?.repoId;
  const repoId = Array.isArray(repoParam) ? repoParam[0] : (repoParam as string | undefined);
  const isRepoRoute = Boolean(repoId);

  const [pages, setPages] = useState<Page[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchPages = async () => {
      try {
        setPagesLoading(true);
        setPagesError(null);
        const userId = resolveUserId();
        const response = await pageApi.getAllPages(userId);
        if (!isActive) return;
        setPages(response.pages ?? []);
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to load pages:", error);
        setPagesError("Unable to load your pages.");
      } finally {
        if (isActive) {
          setPagesLoading(false);
        }
      }
    };

    fetchPages().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  const personalPages = useMemo(() => pages.slice(0, 20), [pages]);

  const handleNavigateToPage = (pageId: string) => {
    if (isRepoRoute && repoId) {
      router.push(`/repo/${repoId}/page/${pageId}`);
      return;
    }

    router.push(`/${pageId}`);
  };

  const handleStartNewChat = async () => {
    if (!isRepoRoute || creatingChat) {
      if (!isRepoRoute) {
        setChatError("Open a repository to start chatting.");
      }
      return;
    }

    try {
      setCreatingChat(true);
      setChatError(null);
      const userId = resolveUserId();
      const response = await chatQaApi.createConversation({ userId });
      router.push(`/repo/${repoId}/conversation/${response.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setChatError("Could not start a new chat. Please try again.");
    } finally {
      setCreatingChat(false);
    }
  };

  const generateConversationId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let id = "";
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const handleCreateDocumentation = () => {
    if (!isRepoRoute) {
      setChatError("Open a repository to create documentation.");
      return;
    }

    const conversationId = generateConversationId();
    router.push(`/repo/${repoId}/conversation/${conversationId}`);
  };

  const renderPersonalPages = () => {
    if (pagesLoading) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-[#343434] bg-[#1f1f1f] px-4 py-3 font-mono text-[12px] text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your pages...
        </div>
      );
    }

    if (pagesError) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-[12px] text-red-300">
          <AlertCircle className="h-4 w-4" />
          {pagesError}
        </div>
      );
    }

    if (personalPages.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-[#343434] bg-[#1f1f1f] px-4 py-3 font-mono text-[12px] text-gray-400">
          No personal pages yet.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {personalPages.map((page) => {
          const updated = page.updated_at ? new Date(page.updated_at).toLocaleDateString() : "Recently";
          const pagePath = isRepoRoute && repoId ? `/repo/${repoId}/page/${page.id}` : `/${page.id}`;
          const isActive = pathname === pagePath;

          return (
            <button
              key={page.id}
              onClick={() => handleNavigateToPage(page.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                isActive
                  ? "border-[#5b5bff] bg-[#2d2d4f] text-white"
                  : "border-[#343434] bg-[#262626] text-gray-200 hover:border-[#5b5bff]/60 hover:bg-[#2d2d4f]/60"
              }`}
            >
              <Notebook className="h-4 w-4 text-[#8b8bff]" />
              <div className="flex flex-col">
                <span className="font-mono text-[14px]">{page.title || "Untitled page"}</span>
                <span className="font-mono text-[12px] text-gray-400">Updated {updated}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Slide-out panel */}
      <div
        className={`fixed inset-y-0 left-0 z-60 w-[410px] max-w-[100vw] transform overflow-hidden rounded-r-xl border border-[#343434] bg-[#1f1f1f] shadow-[0px_12px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-[380px]"
        }`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Card className="h-full rounded-none rounded-r-xl border-none bg-transparent p-0 text-white shadow-none">
          <CardHeader className="rounded-none rounded-tr-xl border-b border-[#343434] bg-[#262626] px-6 py-5">
            <CardTitle className="font-mono text-[24px]">Book</CardTitle>
            <CardDescription className="font-mono text-[14px] text-gray-400">
              Quick access to your docs.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            <ScrollArea className="max-h-[calc(100vh-120px)] px-6 py-6 overflow-auto">
              <div className="mb-4 flex">
                <Button
                  className="h-8 px-3 py-1 text-[12px] font-mono bg-[#c58122] text-white hover:bg-[#7d5a28]"
                  onClick={handleCreateDocumentation}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Start
                </Button>
              </div>
              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-gray-400">
                    <Building2 className="h-3 w-3" />
                    Organisation
                  </div>
                  <div className="mt-3 space-y-4">
                    <div className="rounded-2xl border border-[#343434] bg-[#262626] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-mono text-[16px] text-white">Pages</h3>
                          <p className="font-mono text-[12px] text-gray-400">Shared documentation coming soon.</p>
                        </div>
                      </div>
                      <Separator className="my-4 bg-[#343434]" />
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            if (!isRepoRoute) {
                              setChatError("Open a repository to view its overview.");
                              return;
                            }
                            router.push(`/repo/${repoId}`);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                            pathname === `/repo/${repoId}`
                              ? "border-[#5b5bff] bg-[#2d2d4f] text-white"
                              : "border-[#343434] bg-[#262626] text-gray-200 hover:border-[#5b5bff]/60 hover:bg-[#2d2d4f]/60"
                          }`}
                        >
                          <Building2 className="h-4 w-4 text-[#8b8bff]" />
                          <div className="flex flex-col">
                            <span className="font-mono text-[14px]">Repo Overview</span>
                            <span className="font-mono text-[12px] text-gray-400">Open repository summary</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-gray-400">
                    Personal
                  </div>
                  <div className="mt-3 space-y-4">
                    <div className="rounded-2xl border border-[#343434] bg-[#262626] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-mono text-[16px] text-white">Pages</h3>
                          <p className="font-mono text-[12px] text-gray-400">All pages you&apos;ve created.</p>
                        </div>
                      </div>
                      <Separator className="my-4 bg-[#343434]" />
                      {renderPersonalPages()}
                    </div>

                    {/* <div className="rounded-2xl border border-[#343434] bg-[#262626] p-4"> */}
                      {/* <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-mono text-[16px] text-white">Chat</h3>
                          <p className="font-mono text-[12px] text-gray-400">
                            Start a fresh AI discussion for the current repo.
                          </p>
                        </div>
                      </div> */}
                      {/* <Separator className="my-4 bg-[#343434]" /> */}
                      {/* <div className="space-y-3">
                        {chatError && (
                          <div className="flex items-center gap-2 rounded-lg border border-[#5b5bff]/40 bg-[#2d2d4f]/40 px-3 py-2 font-mono text-[12px] text-[#bfbfff]">
                            <AlertCircle className="h-4 w-4" />
                            {chatError}
                          </div>
                        )}
                        {!isRepoRoute && !chatError && (
                          <div className="rounded-lg border border-dashed border-[#343434] bg-[#1f1f1f] px-3 py-2 font-mono text-[12px] text-gray-500">
                            Open a repository to enable chat.
                          </div>
                        )}
                      </div> */}
                    {/* </div> */}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

      </div>

      {/* Slim handle to open the panel */}
      {/* <div className="fixed left-0 top-1/2 z-60 -translate-y-1/2">
        <button
          type="button"
          onMouseEnter={() => setIsOpen(true)}
          className="flex h-32 w-6 items-center justify-center rounded-r-lg border border-[#343434] border-l-transparent bg-[#262626] text-gray-300"
          aria-label="Open panel"
        >

          <ChevronRight className="h-4 w-4" />
        </button>
      </div> */}
    </>
  );
}

export default SlidingSidebar;

