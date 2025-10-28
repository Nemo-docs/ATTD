"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageApi } from "@/lib/api";
import { resolveUserId } from "@/lib/user";
import { Page } from "@/types/page";

interface IndexSidebarPopupProps {
  open: boolean;
  onClose: () => void;
  currentPageId?: string;
}

export function IndexSidebarPopup({ open, onClose, currentPageId }: IndexSidebarPopupProps) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewPageForm, setShowNewPageForm] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pageItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const requireUserId = () => resolveUserId();


  // Load pages when popup opens
  useEffect(() => {
    if (open) {
      loadPages();
      setFocusedIndex(-1); // Reset focus when popup opens
    }
  }, [open]);

  // Focus management
  useEffect(() => {
    if (open && dialogRef.current) {
      // Focus the dialog when it opens so it can receive keyboard events
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 100);
    }
  }, [open]);


  // Filter pages based on search term
  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset focus when search term changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm]);

  // Handle focusing the correct page item when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < pageItemRefs.current.length) {
      pageItemRefs.current[focusedIndex]?.focus();
    } else if (focusedIndex === -1) {
      // If no item is focused, make sure nothing else is focused either
      if (document.activeElement !== searchInputRef.current) {
        searchInputRef.current?.focus();
      }
    }
  }, [focusedIndex]);

  // Update refs array when filtered pages change
  useEffect(() => {
    pageItemRefs.current = pageItemRefs.current.slice(0, filteredPages.length);
  }, [filteredPages.length]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const userId = requireUserId();
      const response = await pageApi.getAllPages(userId);
      setPages(response.pages);
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;

    try {
      setCreating(true);
      const userId = requireUserId();
      const response = await pageApi.createPage({
        title: newPageTitle.trim(),
        content: "",
        userId,
      });

      // Add the new page to the list
      setPages([response.page, ...pages]);
      setNewPageTitle("");
      setShowNewPageForm(false);

      // Navigate to the new page and close popup
      router.push(`/${response.page.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to create page:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePage = async (pageId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const userId = requireUserId();
      await pageApi.deletePage(pageId, userId);
      setPages(pages.filter(page => page.id !== pageId));

      // If the deleted page was current, navigate to home
      if (currentPageId === pageId) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const handlePageClick = (pageId: string) => {
    router.push(`/${pageId}`);
    onClose();
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md bg-background border-border text-foreground p-0"
        showCloseButton={false}
      >
        <div
          ref={dialogRef}
          className="outline-none"
          tabIndex={-1}
        >
          <DialogHeader className="px-4 py-6 border-b border-border">
          <DialogTitle className="text-lg font-semibold">Pages</DialogTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                switch (e.key) {
                  case 'ArrowDown':
                    if (filteredPages.length > 0) {
                      e.preventDefault();
                      setFocusedIndex(0);
                    }
                    break;
                  case 'Enter':
                    if (filteredPages.length > 0) {
                      e.preventDefault();
                      setFocusedIndex(0);
                    }
                    break;
                  case 'Escape':
                    onClose();
                    break;
                }
              }}
              className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              tabIndex={0}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto max-h-96 px-2 py-4">
          {loading ? (
            <div className="px-3 py-2 text-muted-foreground">Loading pages...</div>
          ) : (
            <div className="space-y-1">
              {filteredPages.length === 0 ? (
                <div className="px-3 py-2 text-muted-foreground">
                  {searchTerm ? 'No pages match your search' : 'No pages yet'}
                </div>
              ) : (
                filteredPages.map((page, index) => {
                  const isCurrentPage = currentPageId === page.id;
                  const isFocused = focusedIndex === index;

                  return (
                    <div key={page.id} className="group relative">
                      <div
                        ref={(el) => {
                          pageItemRefs.current[index] = el;
                        }}
                        className={`flex items-center px-3 py-2 rounded cursor-pointer transition-colors ${
                          isCurrentPage
                            ? "bg-primary/30 text-primary-foreground border border-primary/50"
                            : isFocused
                            ? "bg-accent text-accent-foreground ring-2 ring-ring"
                            : "hover:bg-accent text-foreground"
                        }`}
                        onClick={() => handlePageClick(page.id)}
                        tabIndex={focusedIndex === index ? 0 : -1}
                        onKeyDown={(e) => {
                          switch (e.key) {
                            case 'Enter':
                              e.preventDefault();
                              handlePageClick(page.id);
                              break;
                            case 'ArrowDown':
                              e.preventDefault();
                              if (index < filteredPages.length - 1) {
                                setFocusedIndex(index + 1);
                              }
                              break;
                            case 'ArrowUp':
                              e.preventDefault();
                              if (index > 0) {
                                setFocusedIndex(index - 1);
                              } else {
                                // Go back to search input
                                searchInputRef.current?.focus();
                                setFocusedIndex(-1);
                              }
                              break;
                            case 'Escape':
                              onClose();
                              break;
                            default:
                              // If user types a letter, go back to search input
                              if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                searchInputRef.current?.focus();
                                setFocusedIndex(-1);
                              }
                              break;
                          }
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="flex-1 truncate text-sm" title={page.title}>
                          {page.title}
                        </span>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                          onClick={(e) => handleDeletePage(page.id, e)}
                          onKeyDown={(e) => e.stopPropagation()}
                          tabIndex={-1}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            ↑↓ Navigate • Enter Select • Esc Close
          </div>
        </div>

        <div className="px-4 py-4 border-t border-border space-y-3">
          {showNewPageForm ? (
            <div className="space-y-2">
              <Input
                placeholder="Page title..."
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreatePage();
                  } else if (e.key === "Escape") {
                    setShowNewPageForm(false);
                    setNewPageTitle("");
                  }
                }}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreatePage}
                  disabled={!newPageTitle.trim() || creating}
                  className="flex-1"
                  size="sm"
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
                <Button
                  onClick={() => {
                    setShowNewPageForm(false);
                    setNewPageTitle("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowNewPageForm(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Page
            </Button>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
