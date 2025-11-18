"use client";

import { useState, useEffect } from "react";
import { keyApi, APIKeySummary } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Trash2 } from "lucide-react";

interface KeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeysModal({ open, onOpenChange }: KeysModalProps) {
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // API key state
  const [ephemeralApiKey, setEphemeralApiKey] = useState<string | null>(null);
  const [keys, setKeys] = useState<APIKeySummary[]>([]);
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  
  // Error states
  const [createError, setCreateError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Fetch keys list when modal opens
  useEffect(() => {
    if (open) {
      fetchKeys();
    }
  }, [open]);

  const fetchKeys = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const keysList = await keyApi.listKeys();
      setKeys(keysList);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load API keys");
      console.error("Error fetching keys:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setCreateError("Name is required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const response = await keyApi.createKey({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      
      setEphemeralApiKey(response.api_key);
      setName("");
      setDescription("");
      
      // Refresh keys list
      await fetchKeys();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create API key");
      console.error("Error creating key:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyPrefix: string, keyName: string) => {
    const confirmed = confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`);
    if (!confirmed) return;

    setRevokingId(keyPrefix);
    setRevokeError(null);
    try {
      await keyApi.revokeKey(keyPrefix);
      // Refresh keys list
      await fetchKeys();
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Failed to revoke API key");
      console.error("Error revoking key:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }
  };

  const handleModalClose = (newOpen: boolean) => {
    onOpenChange(newOpen);
    
    // Clear ephemeral key when closing
    if (!newOpen) {
      setEphemeralApiKey(null);
      setName("");
      setDescription("");
      setCreateError(null);
      setRevokeError(null);
    }
  };

  const getTruncatedId = (id: string) => {
    return `${id.slice(0, 8)}...`;
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>
            Create and manage your API keys for authentication.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Ephemeral API Key Display (one-time) */}
          {ephemeralApiKey && (
            <div className="space-y-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <label className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ Save Your API Key Now
              </label>
              <div className="p-3 bg-white dark:bg-gray-900 rounded-md font-mono text-sm break-all border">
                {ephemeralApiKey}
              </div>
              <Button
                onClick={() => handleCopyToClipboard(ephemeralApiKey)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
            </div>
          )}

          {/* Create New API Key Form */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Create New API Key</h3>
            <form onSubmit={handleCreateKey} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="key-name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isCreating}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="key-description" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Textarea
                  id="key-description"
                  placeholder="e.g., Used for production server authentication"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  rows={2}
                />
              </div>

              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}

              <Button
                type="submit"
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? "Creating..." : "Create API Key"}
              </Button>
            </form>
          </div>

          {/* API Keys List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Your API Keys</h3>
              {isLoadingList && (
                <span className="text-xs text-muted-foreground">Loading...</span>
              )}
            </div>

            {listError && (
              <p className="text-sm text-destructive">{listError}</p>
            )}

            {revokeError && (
              <p className="text-sm text-destructive">{revokeError}</p>
            )}

            {!isLoadingList && keys.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No API keys yet. Create one above to get started.
              </p>
            )}

            {keys.length > 0 && (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.key_prefix}
                    className="p-3 border rounded-md space-y-2 bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{key.name}</p>
                        {key.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {key.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {getTruncatedId(key.key_prefix)}
                          </p>
                          <button
                            onClick={() => handleCopyToClipboard(key.key_prefix)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy full ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeKey(key.key_prefix, key.name)}
                        disabled={revokingId === key.key_prefix}
                      >
                        {revokingId === key.key_prefix ? (
                          "Revoking..."
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeysModal;
