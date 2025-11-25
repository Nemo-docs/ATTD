import { useState, useEffect } from "react";
import { repoApi } from "@/lib/api";
import { userApi, type UserRepoInfo } from "@/lib/userApi";
import { pageApi } from "@/lib/api";
import type { ProjectIntro } from "@/types/repo";
import type { Page } from "@/types/page";

export function useDashboardData() {
  const [repositories, setRepositories] = useState<ProjectIntro[]>([]);
  const [myRepoInfos, setMyRepoInfos] = useState<UserRepoInfo[]>([]);
  const [myHashes, setMyHashes] = useState(new Set<string>());
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setPagesLoading(true);
      const [data, infos, pagesData] = await Promise.all([
        repoApi.listRepos(),
        userApi.getMyRepoInfos(),
        pageApi.getAllPages()
      ]);
      setRepositories(data);
      setMyRepoInfos(infos);
      setMyHashes(new Set(infos.map((info: UserRepoInfo) => info.repo_hash)));
      setPages(pagesData.pages);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setPagesLoading(false);
    }
  };

  useEffect(() => {
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

  const handleDeletePage = async (page: Page) => {
    if (!confirm(`Delete "${page.title}"? This action cannot be undone.`)) return;
    try {
      await pageApi.deletePage(page.id);
      setPages(prev => prev.filter(p => p.id !== page.id));
    } catch (error) {
      console.error("Failed to delete page:", error);
      alert("Failed to delete page. Please try again.");
    }
  };

  const refetch = fetchData;

  const refetchPages = async () => {
    setPagesLoading(true);
    try {
      const pagesData = await pageApi.getAllPages();
      setPages(pagesData.pages);
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setPagesLoading(false);
    }
  };

  return {
    repositories,
    myRepoInfos,
    myHashes,
    pages,
    loading,
    pagesLoading,
    handleAdd,
    handleRemove,
    handleDeletePage,
    refetch,
    refetchPages
  };
}
