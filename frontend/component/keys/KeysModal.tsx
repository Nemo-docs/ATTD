"use client";

import { useState, useEffect } from "react";
import { resolveUserId } from "@/lib/user";
import { useGetToken } from "@/hooks/getToken";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const API_KEY_CREATED_FLAG = "apiKeyCreated";

interface KeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeysModal({ open, onOpenChange }: KeysModalProps) {
  const [userId, setUserId] = useState<string>("");
  const [hasCreatedKey, setHasCreatedKey] = useState(false);
  const { apiKey, isLoading, error, generateKey, clearApiKey } = useGetToken();

  // Load user ID on mount
  useEffect(() => {
    try {
      const id = resolveUserId();
      setUserId(id);
    } catch (error) {
      console.error("Failed to resolve user ID:", error);
    }
  }, []);

  // Check localStorage for created flag on mount (SSR-safe)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const created = localStorage.getItem(API_KEY_CREATED_FLAG) === "true";
      setHasCreatedKey(created);
    }
  }, []);

  // Set localStorage flag when apiKey is successfully generated
  useEffect(() => {
    if (apiKey && typeof window !== "undefined") {
      localStorage.setItem(API_KEY_CREATED_FLAG, "true");
      setHasCreatedKey(true);
    }
  }, [apiKey]);

  // Handle API key creation
  const handleCreateKey = async () => {
    await generateKey();
  };

  // Handle modal close
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    
    // Clear API key from state when closing
    if (!newOpen) {
      clearApiKey();
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (apiKey && typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(apiKey);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>
            Manage your API keys for authentication.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* User ID Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <div className="p-3 bg-muted rounded-md font-mono text-sm">
              {userId || "Loading..."}
            </div>
          </div>

          {/* API Key Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            
            {!hasCreatedKey && !apiKey && (
              <Button
                onClick={handleCreateKey}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create API Key"}
              </Button>
            )}

            {apiKey && (
              <div className="space-y-2">
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {apiKey}
                </div>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="w-full"
                >
                  Copy to Clipboard
                </Button>
                <p className="text-xs text-muted-foreground">
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeysModal;