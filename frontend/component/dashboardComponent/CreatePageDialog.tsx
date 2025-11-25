"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pageApi } from "@/lib/api";
import type { ProjectIntro } from "@/types/repo";

interface CreatePageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRepo: ProjectIntro | null;
}

export function CreatePageDialog({ isOpen, onOpenChange, selectedRepo }: CreatePageDialogProps) {
  const router = useRouter();
  const [newPageTitle, setNewPageTitle] = useState('');

  const handleCreatePage = async () => {
    if (!newPageTitle.trim() || !selectedRepo) return;
    try {
      const response = await pageApi.createPage({ 
        title: newPageTitle, 
        content: '', 
        repo_hash: selectedRepo.repo_hash, 
        repo_name: selectedRepo.name 
      });
      onOpenChange(false);
      setNewPageTitle('');
      router.push(`/repo/${selectedRepo.repo_hash}/page/${response.page.id}`);
    } catch (error) {
      console.error("Failed to create page:", error);
      alert("Failed to create page. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#262626] text-white max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-[18px] font-medium">Create New Page</DialogTitle>
          <DialogDescription className="font-mono text-[14px] text-gray-500">
            Enter a title for your new page. Content can be added later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Input
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreatePage();
              }
            }}
            className="bg-[#191919] font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
            placeholder="Page title..."
            autoFocus
          />
        </div>
        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { onOpenChange(false); setNewPageTitle(''); }}>Cancel</Button>
            <Button 
              onClick={handleCreatePage} 
              disabled={!newPageTitle.trim()}
              className="bg-white/10 font-mono text-[14px] text-white hover:bg-white/15"
            >
              Create Page
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
