// "use client";

// import React, { useEffect, useState, useRef } from "react";
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Heading from "@tiptap/extension-heading";
// import CodeBlock from "@tiptap/extension-code-block";
// import { pageApi } from "../../lib/api";
// import { resolveUserId } from "../../lib/user";
// import { Button } from "../../components/ui/button";
// import { Save } from "lucide-react";

// interface MarkdownEditorProps {
//   onCreatePage?: (title: string, content: string) => Promise<string | null>;
//   currentPageId?: string;
//   initialContent?: string;
//   initialTitle?: string;
// }

// export default function MarkdownEditor({
//   onCreatePage,
//   currentPageId,
//   initialContent = "",
//   initialTitle = ""
// }: MarkdownEditorProps) {
//   const [showSlashMenu, setShowSlashMenu] = useState(false);
//   const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
//   const [query, setQuery] = useState("");
//   const [selectedIndex, setSelectedIndex] = useState(0);
//   const [title, setTitle] = useState(initialTitle || "Untitled");
//   const [isSaving, setIsSaving] = useState(false);
//   const [lastSaved, setLastSaved] = useState<Date | null>(null);
//   const menuRef = useRef<HTMLDivElement | null>(null);
//   const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   const requireUserId = () => resolveUserId();

//   const items = [
//     { id: "h1", title: "H1" },
//     { id: "h2", title: "H2" },
//     { id: "h3", title: "H3" },
//     { id: "h4", title: "H4" },
//     { id: "h5", title: "H5" },
//     { id: "code", title: "Code" },
//   ];

//   const editor = useEditor({
//     extensions: [
//       StarterKit,
//       Heading.configure({ levels: [1, 2, 3, 4, 5] }),
//       CodeBlock,
//     ],
//     content: initialContent || "<h1>Untitled</h1><p></p>",
//     // Avoid SSR hydration mismatch by delaying client render
//     immediatelyRender: false,
//     autofocus: true,
//     editorProps: {
//       attributes: {
//         class: "ProseMirror prose min-h-[60vh] bg-background text-foreground outline-none",
//       },
//     },
//     onUpdate: ({ editor }) => {
//       // Auto-save after 2 seconds of inactivity
//       if (autoSaveTimeoutRef.current) {
//         clearTimeout(autoSaveTimeoutRef.current);
//       }

//       autoSaveTimeoutRef.current = setTimeout(() => {
//         handleAutoSave();
//       }, 2000);
//     },
//   });

//   // Save functions
//   const handleSave = async () => {
//     if (!editor) return;

//     const content = editor.getHTML();

//     if (currentPageId) {
//       // Update existing page
//       try {
//         setIsSaving(true);
//         const userId = requireUserId();
//         await pageApi.updatePage(currentPageId, userId, {
//           title: title,
//           content: content,
//         });
//         setLastSaved(new Date());
//       } catch (error) {
//         console.error('Failed to save page:', error);
//       } finally {
//         setIsSaving(false);
//       }
//     } else if (onCreatePage) {
//       // Create new page
//       try {
//         setIsSaving(true);
//         await onCreatePage(title, content);
//         setLastSaved(new Date());
//       } catch (error) {
//         console.error('Failed to create page:', error);
//       } finally {
//         setIsSaving(false);
//       }
//     }
//   };

//   const handleAutoSave = async () => {
//     if (!editor) return;

//     const content = editor.getHTML();

//     // Don't auto-save if content is just the default
//     if (content === "<h1>Untitled</h1><p></p>") return;

//     if (currentPageId) {
//       // Update existing page
//       try {
//         const userId = requireUserId();
//         await pageApi.updatePage(currentPageId, userId, {
//           title: title,
//           content: content,
//         });
//         setLastSaved(new Date());
//       } catch (error) {
//         console.error('Failed to auto-save page:', error);
//       }
//     } else if (onCreatePage && content !== "<h1>Untitled</h1><p></p>") {
//       // Create new page only if there's meaningful content
//       try {
//         await onCreatePage(title, content);
//         setLastSaved(new Date());
//       } catch (error) {
//         console.error('Failed to auto-create page:', error);
//       }
//     }
//   };

//   // Update title from first heading if it exists
//   const updateTitleFromContent = () => {
//     if (!editor) return;

//     const content = editor.getText();
//     const firstLine = content.split('\n')[0];

//     if (firstLine && firstLine !== title && firstLine !== "Untitled") {
//       setTitle(firstLine);
//     }
//   };

//   // Cleanup timeout on unmount
//   useEffect(() => {
//     return () => {
//       if (autoSaveTimeoutRef.current) {
//         clearTimeout(autoSaveTimeoutRef.current);
//       }
//     };
//   }, []);

//   useEffect(() => {
//     function onClickOutside(e: MouseEvent) {
//       if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
//         setShowSlashMenu(false);
//         setSelectedIndex(0);
//       }
//     }
//     document.addEventListener("mousedown", onClickOutside);
//     return () => document.removeEventListener("mousedown", onClickOutside);
//   }, []);

//   // Reset selected index when menu closes
//   useEffect(() => {
//     if (!showSlashMenu) {
//       setSelectedIndex(0);
//     }
//   }, [showSlashMenu]);

//   // open slash menu when user types '/'
//   useEffect(() => {
//     if (!editor) return;

//     const handleKeyDown = (event: KeyboardEvent) => {
//       // Handle slash menu navigation
//       if (showSlashMenu) {
//         switch (event.key) {
//           case "ArrowDown":
//             event.preventDefault();
//             setSelectedIndex((prev) => (prev + 1) % items.length);
//             return;
//           case "ArrowUp":
//             event.preventDefault();
//             setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
//             return;
//           case "Enter":
//             event.preventDefault();
//             onSelectItem(items[selectedIndex]);
//             return;
//           case "Escape":
//             event.preventDefault();
//             setShowSlashMenu(false);
//             setSelectedIndex(0);
//             return;
//         }
//       }

//       // Handle opening slash menu
//       if (event.key === "/") {
//         event.preventDefault(); // Prevent the "/" from being inserted

//         // Remove the "/" character that was just typed
//         const { from } = editor.state.selection;
//         editor.view.dispatch(editor.state.tr.delete(from - 1, from));

//         // Compute position from the new selection (after deleting "/")
//         const newCoords = editor.view.coordsAtPos(from - 1);
//         const editorRect = editor.view.dom.getBoundingClientRect();
//         setMenuPos({ top: newCoords.bottom - editorRect.top + 6, left: newCoords.left - editorRect.left });
//         setShowSlashMenu(true);
//         setSelectedIndex(0);
//         setQuery("");
//       } else if (event.key === "Escape" && !showSlashMenu) {
//         // Only handle escape when menu is not shown
//         return;
//       }
//     };

//     // attach on the editor DOM to ensure we capture keys while focused
//     const dom = editor.view.dom;
//     dom.addEventListener("keydown", handleKeyDown);
//     return () => dom.removeEventListener("keydown", handleKeyDown);
//   }, [editor, showSlashMenu, selectedIndex, items]);

//   function onSelectItem(item: { id: string; title: string }) {
//     if (!editor) return;

//     // Apply the appropriate formatting without inserting markdown symbols
//     switch (item.id) {
//       case "h1":
//         editor.chain().focus().setHeading({ level: 1 }).run();
//         break;
//       case "h2":
//         editor.chain().focus().setHeading({ level: 2 }).run();
//         break;
//       case "h3":
//         editor.chain().focus().setHeading({ level: 3 }).run();
//         break;
//       case "h4":
//         editor.chain().focus().setHeading({ level: 4 }).run();
//         break;
//       case "h5":
//         editor.chain().focus().setHeading({ level: 5 }).run();
//         break;
//       case "p":
//         editor.chain().focus().setParagraph().run();
//         break;
//       case "code":
//         editor.chain().focus().toggleCodeBlock().run();
//         break;
//     }

//     setShowSlashMenu(false);
//     editor.commands.focus();
//   }

//   return (
//     <div className="flex-1 min-h-screen bg-background text-foreground">
//       <div className="border-b border-border px-6 py-4 relative flex items-center">
//         {/* Centered Title */}
//         <div className="flex-1 flex justify-center">
//           <input
//             type="text"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             onBlur={updateTitleFromContent}
//             className="bg-transparent text-foreground text-xl font-semibold outline-none border-b border-transparent hover:border-border focus:border-ring transition-colors text-center"
//             placeholder="Untitled"
//           />
//         </div>

//         {/* Right-aligned DateTime */}
//         {lastSaved && (
//           <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
//             <span className="text-sm text-muted-foreground">
//               Saved {lastSaved.toLocaleTimeString()}
//             </span>
//           </div>
//         )}
//       </div>

//       <div className="p-6 relative flex justify-center">
//         {showSlashMenu && menuPos && (
//           <div ref={menuRef} style={{ top: menuPos.top, left: menuPos.left }} className="absolute z-50 bg-background border border-border rounded shadow-md w-48">
//             <ul className="p-2">
//               {items.map((it, index) => (
//                 <li
//                   key={it.id}
//                   className={`px-2 py-2 cursor-pointer rounded ${
//                     index === selectedIndex
//                       ? "bg-primary text-primary-foreground"
//                       : "hover:bg-accent"
//                   }`}
//                   onMouseDown={(e) => {
//                     e.preventDefault();
//                     onSelectItem(it);
//                   }}
//                   onMouseEnter={() => setSelectedIndex(index)}
//                 >
//                   {it.title}
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         <div className="w-[70%] bg-background">
//           <EditorContent editor={editor} />
//         </div>
//       </div>
//     </div>
//   );
// }


