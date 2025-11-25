"use client";

import { useState } from "react";

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { repoApi } from "@/lib/api";

interface CloneDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCloneSuccess: () => void; // to refetch data
}

export function CloneDialog({ isOpen, onOpenChange, onCloneSuccess }: CloneDialogProps) {
  const [githubUrl, setGithubUrl] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const handleClone = async () => {
    if (!githubUrl) return;
    setCloning(true);
    setCloneError(null);
    try {
      await repoApi.createRepo({ github_url: githubUrl });
      onCloneSuccess();
      setGithubUrl("");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setCloneError((err as any).message ?? String(err));
    } finally {
      setCloning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#262626] text-white max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-[18px] font-medium">Clone GitHub Repository</DialogTitle>
          <DialogDescription className="font-mono text-[14px] text-gray-500">
            Enter the GitHub URL to clone a new repository.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            className="flex-1 border-white/10 bg-[#191919] font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
            placeholder="Enter GitHub URL (e.g. https://github.com/user/repo)"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={cloning}
          />
          <Button 
            className="h-10 bg-white/10 font-mono text-[14px] text-white hover:bg-white/15" 
            onClick={handleClone} 
            disabled={!githubUrl || cloning}
          >
            {cloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {cloning ? 'Cloning...' : 'Clone'}
          </Button>
        </div>
        {cloneError && (
          <p className="text-red-400 text-sm mt-2 font-mono text-[14px]">{cloneError}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
