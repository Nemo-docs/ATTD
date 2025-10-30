"use client";

import { useEffect, useState } from "react";
// import IndexSidebar from "../component/index_sidebar/index_sidebar";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { pageApi, repoApi, userApi } from "../lib/api";
import { ensureUserId, resolveUserId } from "../lib/user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, FileText, Bot } from "lucide-react";


type ViewMode = 'chat' | 'editor';

/**
 * Main Application Page
 *
 * Currently displays the Chat Interface as the default view.
 * The Markdown Editor functionality is preserved but not rendered by default.
 *
 * View Modes:
 * - 'chat': Shows the AI chat interface (default)
 * - 'editor': Shows the markdown editor (currently hidden)
 */
export default function Home() {
  const router = useRouter();
  const [currentPageId, setCurrentPageId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>('chat'); // Default to chat interface

  const [githubUrl, setGithubUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const ensureUser = async () => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const userId = ensureUserId();

        await userApi.register(userId);
      } catch (error) {
        console.warn("Failed to register anonymous user", error);
      }
    };

    void ensureUser();
  }, []);

  const handleCreatePage = async (title: string, content: string) => {
    try {
      const userId = resolveUserId();

      const response = await pageApi.createPage({
        title: title || "Untitled",
        content: content,
        userId,
      });

      // Navigate to the new page
      router.push(`/${response.page.id}`);
      setCurrentPageId(response.page.id);
      return response.page.id;
    } catch (error) {
      console.error('Failed to create page:', error);
      return null;
    }
  };

  const handleClone = async () => {
    if (!githubUrl) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await repoApi.createRepo({ github_url: githubUrl });
      setResult(res);
      // persist the response locally so the repo page can read and display it
      try {
        if (res && (res as any).repo_hash) {
          sessionStorage.setItem(`repo_${(res as any).repo_hash}`, JSON.stringify(res));
          // navigate to the repo page whose id equals the repo_hash
          router.push(`/repo/${(res as any).repo_hash}`);
        }
      } catch (e) {
        // sessionStorage may not be available in some environments; ignore
        console.warn('could not persist clone result to sessionStorage', e);
      }
      setGithubUrl("");
    } catch (err) {
      console.error(err);
      setResult({ error: (err as any).message ?? String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans bg-[#191919] text-white">
      <main className="flex-1 h-screen flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <Card className="p-6 bg-[#262626] text-white">
            <div className="flex items-center gap-3 mb-4">
              <Bot />
              <h2 className="text-2xl">Clone GitHub Repository</h2>
            </div>

            <div className="flex gap-2">
              <Input
                className="flex-1 bg-[#1f1f1f] text-white placeholder:text-zinc-400"
                placeholder="Enter GitHub URL (e.g. https://github.com/user/repo)"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <Button onClick={handleClone} disabled={!githubUrl || loading}>
                {loading ? 'Cloning...' : 'Clone'}
              </Button>
            </div>

            
          </Card>
        </div>
      </main>
    </div>
  );
}
