"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Building2, Notebook, Plus, Loader2, AlertCircle, ChevronRight, ChevronLeft, Settings, FileText } from "lucide-react";
import { KeysModal } from "@/component/keys/KeysModal";
import { pageApi, chatQaApi } from "@/lib/api";
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
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchPages = async () => {
      try {
        setPagesLoading(true);
        setPagesError(null);
        const response = await pageApi.getAllPages();
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
      const response = await chatQaApi.createConversation({});
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
        <div className="flex items-center gap-2 px-3 py-2 font-mono text-[12px] text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </div>
      );
    }

    if (pagesError) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 font-mono text-[12px] text-red-400">
          <AlertCircle className="h-3 w-3" />
          {pagesError}
        </div>
      );
    }

    if (personalPages.length === 0) {
      return (
        <div className="px-3 py-2 font-mono text-[12px] text-gray-600">
          No pages yet
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {personalPages.map((page) => {
          const pagePath = isRepoRoute && repoId ? `/repo/${repoId}/page/${page.id}` : `/${page.id}`;
          const isActive = pathname === pagePath;

          return (
            <button
              key={page.id}
              onClick={() => handleNavigateToPage(page.id)}
              className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
                isActive
                  ? "bg-[#2a2a2a] text-white"
                  : "text-gray-400 hover:bg-[#232323] hover:text-gray-200"
              }`}
            >
              <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-gray-300" : "text-gray-600"}`} />
              <span className="font-mono text-[14px] truncate">{page.title || "Untitled"}</span>
            </button>
          );
        })}
      </div>
    );
  };
  
  return (
    <>
      {/* Left edge hover area */}
      <div
        className="fixed left-0 top-0 z-50 h-full w-[50px]"
        onMouseEnter={() => setIsOpen(true)}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed inset-y-0 left-0 z-60 w-[280px] transform overflow-hidden border-r border-[#2a2a2a] bg-[#191919] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-4">
            <div className="flex items-center gap-2">
              {/* <div className="h-2 w-2 rounded-full bg-gray-600"></div> */}
              <h2 className="font-mono text-[14px] font-medium text-gray-300">Nemo</h2>
            </div>
            <button
              onClick={() => setIsKeysModalOpen(true)}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-[#2a2a2a] hover:text-gray-300"
              title="API Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-3 py-4">
            <div className="space-y-6">
              {/* New Doc Button */}
              <button
                onClick={handleCreateDocumentation}
                className="flex w-full items-center gap-2 rounded-lg bg-[#2a2a2a] px-3 py-2 font-mono text-[14px] text-gray-300 transition-colors hover:bg-[#333333] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                New Doc
              </button>

              {/* Organisation Section */}
              <div>
                <div className="mb-2 px-2 font-mono text-[12px] font-medium uppercase tracking-wider text-gray-600">
                  Workspace
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (!isRepoRoute) {
                        setChatError("Open a repository to view its overview.");
                        return;
                      }
                      router.push(`/repo/${repoId}`);
                    }}
                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
                      pathname === `/repo/${repoId}`
                        ? "bg-[#2a2a2a] text-white"
                        : "text-gray-400 hover:bg-[#232323] hover:text-gray-200"
                    }`}
                  >
                    <Building2 className={`h-3.5 w-3.5 flex-shrink-0 ${pathname === `/repo/${repoId}` ? "text-gray-300" : "text-gray-600"}`} />
                    <span className="font-mono text-[14px]">Overview</span>
                  </button>
                </div>
              </div>

              {/* Personal Pages Section */}
              <div>
                <div className="mb-2 px-2 font-mono text-[12px] font-medium uppercase tracking-wider text-gray-600">
                  Pages
                </div>
                {renderPersonalPages()}
              </div>
            </div>
          </ScrollArea>

          {/* Footer status (optional) */}
          {chatError && (
            <div className="border-t border-[#2a2a2a] px-3 py-2">
              <div className="flex items-start gap-2 rounded-md bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400">
                <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="font-mono leading-tight">{chatError}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle handle - follows sidebar */}
      <button
        // onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 z-[70] flex h-100 w-[20px] -translate-y-1/2 items-center justify-center rounded-r-lg  bg-gray-800  text-white shadow-lg transition-all duration-300 ease-in-out hover:bg-gray-100 hover:text-gray-900 ${
          isOpen ? "left-[280px]" : "left-0"
        }`}
        style={{
          clipPath: "polygon(0 10%, 50px 0, 50px 100%, 0 90%)", transform: "rotate(180deg)"
        }}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* KeysModal */}
      <KeysModal
        open={isKeysModalOpen}
        onOpenChange={setIsKeysModalOpen}
      />
    </>
  );
}

export default SlidingSidebar;

