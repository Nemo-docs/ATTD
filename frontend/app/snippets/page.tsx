"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";
import { snippetApi } from "@/lib/snippetApi";
import { resolveUserId } from "@/lib/user";
import { useSnippets } from "@/hooks/useSnippets";
import type { Snippet, CreateSnippetRequest, UpdateSnippetRequest } from "@/types/snippet";

export default function SnippetsPage() {
  const [userId] = useState<string>(() => (typeof window !== "undefined" ? resolveUserId() : ""));
  const {
    snippets: cachedSnippets,
    filteredSnippets,
    isLoading,
    error,
    searchQuery,
    searchSnippets,
    refresh,
  } = useSnippets(userId);
  const [newContent, setNewContent] = useState<string>("");
  const [newTags, setNewTags] = useState<string>("");
  const [editTarget, setEditTarget] = useState<Snippet | null>(null);
  const [editContentValue, setEditContentValue] = useState<string>("");
  const [editTagsValue, setEditTagsValue] = useState<string>("");
  const [tagTarget, setTagTarget] = useState<Snippet | null>(null);
  const [tagValue, setTagValue] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<Snippet | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const hasLoadedSnippets = cachedSnippets.length > 0;

  const parseTags = (value: string) => value.split(",").map((t) => t.trim()).filter(Boolean);

  const formatSnippetTimestamp = (iso: string) => {
    const normalized = iso.endsWith("Z") ? iso : `${iso}Z`;
    const date = new Date(normalized);
    const datePart = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const timePart = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${datePart} · ${timePart}`;
  };

  const resetCreateForm = () => {
    setNewContent("");
    setNewTags("");
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateLoading(false);
    resetCreateForm();
  };

  const handleCreateSnippet = async () => {
    if (!newContent.trim()) return;
    const payload: CreateSnippetRequest = {
      userId,
      content: newContent.trim(),
      tags: parseTags(newTags),
    };
    setCreateLoading(true);
    try {
      const res = await snippetApi.createSnippet(payload);
      if (res && res.snippet) {
        resetCreateForm();
        setIsCreateDialogOpen(false);
        await refresh();
      }
    } catch (e) {
      console.error("Create failed", e);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleNewContentKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;
    if (createLoading) return;
    event.preventDefault();
    handleCreateSnippet();
  };

  const closeEditDialog = () => {
    setEditTarget(null);
    setEditContentValue("");
    setEditTagsValue("");
  };

  const closeTagDialog = () => {
    setTagTarget(null);
    setTagValue("");
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteLoading(false);
  };

  const openEditDialog = (snippet: Snippet) => {
    setEditTarget(snippet);
    setEditContentValue(snippet.content);
    setEditTagsValue(snippet.tags?.join(", ") ?? "");
  };

  const openTagDialog = (snippet: Snippet) => {
    setTagTarget(snippet);
    setTagValue("");
  };

  const openDeleteDialog = (snippet: Snippet) => {
    setDeleteTarget(snippet);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await snippetApi.deleteSnippet(deleteTarget.id, userId);
      await refresh();
      closeDeleteDialog();
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!tagTarget || !tagValue.trim()) return;
    try {
      const update: UpdateSnippetRequest = { addTags: [tagValue.trim()] };
      await snippetApi.updateSnippet(tagTarget.id, userId, update);
      closeTagDialog();
      await refresh();
    } catch (e) {
      console.error("Add tag failed", e);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !editContentValue.trim()) return;
    try {
      const update: UpdateSnippetRequest = {
        content: editContentValue.trim(),
        tags: parseTags(editTagsValue),
      };
      await snippetApi.updateSnippet(editTarget.id, userId, update);
      closeEditDialog();
      await refresh();
    } catch (e) {
      console.error("Edit failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#191919] text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-[24px] font-medium tracking-tight">snippets</h1>
            <p className="mt-1 text-[14px] text-gray-500">
              {cachedSnippets.length} {cachedSnippets.length === 1 ? "item" : "items"}
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-9 gap-2 rounded-md bg-white/10 px-4 font-mono text-[14px] text-white transition-colors hover:bg-white/15"
          >
            <Plus className="size-4" />
            New
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-600" />
            <Input
              className="h-10 rounded-md border-white/5 bg-white/5 pl-10 font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
              placeholder="search..."
              value={searchQuery}
              onChange={(e) => searchSnippets(e.target.value)}
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-[14px] text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center gap-2 font-mono text-[14px] text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            loading...
          </div>
        ) : filteredSnippets.length ? (
          /* Snippets List */
          <div className="space-y-3">
            {filteredSnippets.map((s) => (
              <div
                key={s.id}
                className="group relative rounded-md border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <pre className="whitespace-pre-wrap font-mono text-[14px] leading-relaxed text-gray-200">
                      {s.content}
                    </pre>
                    
                    {/* Tags */}
                    {s.tags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-sm bg-white/5 px-2 py-0.5 font-mono text-[12px] text-gray-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="font-mono text-[12px] text-gray-600">
                      {formatSnippetTimestamp(s.createdAt)}
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-500 hover:bg-white/10 hover:text-white"
                        onClick={() => openEditDialog(s)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-500 hover:bg-white/10 hover:text-white"
                        onClick={() => openTagDialog(s)}
                      >
                        <Tag className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => openDeleteDialog(s)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
            <p className="font-mono text-[14px] text-gray-600">
              {searchQuery.trim()
                ? `no results for "${searchQuery}"`
                : hasLoadedSnippets
                ? "no snippets found"
                : "no snippets yet"}
            </p>
            {!searchQuery.trim() && !hasLoadedSnippets && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                variant="ghost"
                className="mt-4 font-mono text-[14px] text-gray-500 hover:text-white"
              >
                create your first snippet
              </Button>
            )}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) { closeCreateDialog(); } else { setIsCreateDialogOpen(true); } }}>
          <DialogContent className="border-white/10 bg-[#262626] text-white sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-[18px] font-medium">new snippet</DialogTitle>
              <DialogDescription className="font-mono text-[14px] text-gray-500">
                capture code, commands, or notes
              </DialogDescription>
            </DialogHeader>
            <Textarea
              className="min-h-32 border-white/10 bg-[#191919] font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
              placeholder="paste your snippet here..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={handleNewContentKeyDown}
              rows={8}
            />
            <Input
              className="border-white/10 bg-[#191919] font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
              placeholder="tags (comma separated)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
            />
            <DialogFooter>
              <Button 
                variant="ghost" 
                className="font-mono text-[14px] text-gray-500 hover:text-white" 
                onClick={closeCreateDialog} 
                disabled={createLoading}
              >
                cancel
              </Button>
              <Button
                className="bg-white/10 font-mono text-[14px] text-white hover:bg-white/15"
                onClick={handleCreateSnippet}
                disabled={createLoading || !newContent.trim()}
              >
                {createLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    creating...
                  </span>
                ) : (
                  "create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={Boolean(editTarget)} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
          <DialogContent className="border-white/10 bg-[#262626] text-white sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-[18px] font-medium">edit snippet</DialogTitle>
              <DialogDescription className="font-mono text-[14px] text-gray-500">
                update content and tags
              </DialogDescription>
            </DialogHeader>
            <Textarea
              className="min-h-32 border-white/10 bg-[#191919] font-mono text-[14px] text-white focus-visible:ring-1 focus-visible:ring-white/20"
              value={editContentValue}
              onChange={(e) => setEditContentValue(e.target.value)}
              rows={8}
            />
            <Input
              className="border-white/10 bg-[#191919] font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
              placeholder="tags (comma separated)"
              value={editTagsValue}
              onChange={(e) => setEditTagsValue(e.target.value)}
            />
            <DialogFooter>
              <Button 
                variant="ghost" 
                className="font-mono text-[14px] text-gray-500 hover:text-white" 
                onClick={closeEditDialog}
              >
                cancel
              </Button>
              <Button 
                className="bg-white/10 font-mono text-[14px] text-white hover:bg-white/15" 
                onClick={handleEdit} 
                disabled={!editContentValue.trim()}
              >
                save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tag Dialog */}
        <Dialog open={Boolean(tagTarget)} onOpenChange={(open) => { if (!open) closeTagDialog(); }}>
          <DialogContent className="border-white/10 bg-[#262626] text-white">
            <DialogHeader>
              <DialogTitle className="font-mono text-[18px] font-medium">add tag</DialogTitle>
              <DialogDescription className="font-mono text-[14px] text-gray-500">
                tag this snippet for easier discovery
              </DialogDescription>
            </DialogHeader>
            <Input
              className="border-white/10 bg-[#191919] font-mono text-[14px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-white/20"
              placeholder="e.g. python, api, config"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
            />
            <DialogFooter>
              <Button 
                variant="ghost" 
                className="font-mono text-[14px] text-gray-500 hover:text-white" 
                onClick={closeTagDialog}
              >
                cancel
              </Button>
              <Button 
                className="bg-white/10 font-mono text-[14px] text-white hover:bg-white/15" 
                onClick={handleAddTag} 
                disabled={!tagValue.trim()}
              >
                add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
          <DialogContent className="border-white/10 bg-[#262626] text-white">
            <DialogHeader>
              <DialogTitle className="font-mono text-[18px] font-medium text-red-400">delete snippet</DialogTitle>
              <DialogDescription className="font-mono text-[14px] text-gray-500">
                this action cannot be undone
              </DialogDescription>
            </DialogHeader>
            {deleteTarget && (
              <div className="rounded-md border border-white/10 bg-[#191919] p-3 font-mono text-[13px] text-gray-400">
                {deleteTarget.content.slice(0, 200)}
                {deleteTarget.content.length > 200 && "..."}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                className="font-mono text-[14px] text-gray-500 hover:text-white"
                onClick={closeDeleteDialog}
                disabled={deleteLoading}
              >
                cancel
              </Button>
              <Button 
                className="bg-red-500/20 font-mono text-[14px] text-red-400 hover:bg-red-500/30" 
                onClick={handleDelete} 
                disabled={deleteLoading || !deleteTarget}
              >
                {deleteLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    deleting...
                  </span>
                ) : (
                  "delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
