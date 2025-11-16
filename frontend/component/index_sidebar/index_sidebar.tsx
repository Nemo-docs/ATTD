// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Plus, FileText, Trash2 } from "lucide-react";
// import { Button } from "../../components/ui/button";
// import { Input } from "../../components/ui/input";
// import { pageApi } from "../../lib/api";
// import { resolveUserId } from "../../lib/user";
// import { Page } from "../../types/page";

// interface IndexSidebarProps {
//   currentPageId?: string;
//   onPageSelect?: (pageId: string) => void;
// }

// export default function IndexSidebar({ currentPageId, onPageSelect }: IndexSidebarProps) {
//   const router = useRouter();
//   const [pages, setPages] = useState<Page[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showNewPageForm, setShowNewPageForm] = useState(false);
//   const [newPageTitle, setNewPageTitle] = useState("");
//   const [creating, setCreating] = useState(false);

//   const requireUserId = () => resolveUserId();

//   // Load pages on component mount
//   useEffect(() => {
//     loadPages();
//   }, []);

//   const loadPages = async () => {
//     try {
//       setLoading(true);
//       const userId = requireUserId();
//       const response = await pageApi.getAllPages(userId);
//       setPages(response.pages);
//     } catch (error) {
//       console.error('Failed to load pages:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreatePage = async () => {
//     if (!newPageTitle.trim()) return;

//     try {
//       setCreating(true);
//       const userId = requireUserId();
//       const response = await pageApi.createPage({
//         title: newPageTitle.trim(),
//         content: "",
//         userId,
//       });

//       // Add the new page to the list
//       setPages([response.page, ...pages]);
//       setNewPageTitle("");
//       setShowNewPageForm(false);

//       // Navigate to the new page
//       router.push(`/${response.page.id}`);
//       onPageSelect?.(response.page.id);
//     } catch (error) {
//       console.error('Failed to create page:', error);
//     } finally {
//       setCreating(false);
//     }
//   };

//   const handleDeletePage = async (pageId: string, event: React.MouseEvent) => {
//     event.stopPropagation();

//     if (!confirm('Are you sure you want to delete this page?')) return;

//     try {
//       const userId = requireUserId();
//       await pageApi.deletePage(pageId, userId);
//       setPages(pages.filter(page => page.id !== pageId));

//       // If the deleted page was current, navigate to home
//       if (currentPageId === pageId) {
//         router.push('/');
//         onPageSelect?.('');
//       }
//     } catch (error) {
//       console.error('Failed to delete page:', error);
//     }
//   };

//   const handlePageClick = (pageId: string) => {
//     router.push(`/${pageId}`);
//     onPageSelect?.(pageId);
//   };

//   return (
//     <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
//       <div className="px-4 py-6 border-b border-sidebar-border">
//         <h2 className="text-lg font-semibold">Pages</h2>
//       </div>

//       <nav className="flex-1 overflow-auto px-2 py-4">
//         {loading ? (
//           <div className="px-3 py-2 text-sidebar-foreground/60">Loading pages...</div>
//         ) : (
//           <ul className="space-y-1">
//             {pages.length === 0 ? (
//               <div className="px-3 py-2 text-sidebar-foreground/60">No pages yet</div>
//             ) : (
//               pages.map((page) => (
//                 <li key={page.id} className="group relative">
//                   <div
//                     className={`flex items-center px-3 py-2 rounded cursor-pointer transition-colors ${
//                       currentPageId === page.id
//                         ? "bg-sidebar-accent text-sidebar-accent-foreground"
//                         : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
//                     }`}
//                     onClick={() => handlePageClick(page.id)}
//                   >
//                     <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
//                     <span className="flex-1 truncate text-sm" title={page.title}>
//                       {page.title}
//                     </span>
//                     <button
//                       className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
//                       onClick={(e) => handleDeletePage(page.id, e)}
//                     >
//                       <Trash2 className="w-3 h-3 text-destructive" />
//                     </button>
//                   </div>
//                 </li>
//               ))
//             )}
//           </ul>
//         )}
//       </nav>

//       <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
//         {showNewPageForm ? (
//           <div className="space-y-2">
//             <Input
//               placeholder="Page title..."
//               value={newPageTitle}
//               onChange={(e) => setNewPageTitle(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter") {
//                   handleCreatePage();
//                 } else if (e.key === "Escape") {
//                   setShowNewPageForm(false);
//                   setNewPageTitle("");
//                 }
//               }}
//               className="bg-background border-border text-foreground placeholder:text-muted-foreground"
//               autoFocus
//             />
//             <div className="flex gap-2">
//               <Button
//                 onClick={handleCreatePage}
//                 disabled={!newPageTitle.trim() || creating}
//                 className="flex-1"
//                 size="sm"
//               >
//                 {creating ? "Creating..." : "Create"}
//               </Button>
//               <Button
//                 onClick={() => {
//                   setShowNewPageForm(false);
//                   setNewPageTitle("");
//                 }}
//                 variant="outline"
//                 size="sm"
//               >
//                 Cancel
//               </Button>
//             </div>
//           </div>
//         ) : (
//           <Button
//             onClick={() => setShowNewPageForm(true)}
//             className="w-full"
//           >
//             <Plus className="w-4 h-4 mr-2" />
//             New Page
//           </Button>
//         )}
//       </div>
//     </aside>
//   );
// }


