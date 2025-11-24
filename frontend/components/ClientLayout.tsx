"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCtrlP } from "@/hooks/useCtrlP";
import { useCtrlK } from "@/hooks/useCtrlK";
import { inlineQnaApi, useInitializeAuth } from "@/lib/api";
import SlidingSidebar from "@/component/sidebar/SlidingSidebar";
import { useAuth } from "@clerk/nextjs";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  // Initialize authentication for API calls
  useInitializeAuth();

  const [isIndexPopupOpen, setIsIndexPopupOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPalettePosition, setCommandPalettePosition] = useState<{ x: number; y: number; element: Element | null }>({ x: 0, y: 0, element: null });
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const isAuthRoute = pathname?.startsWith("/login");

  // Extract current page ID from pathname
  // pathname format: "/" for home, "/{pageId}" for pages
  const currentPageId = pathname === "/" ? "" : pathname.slice(1);

  const handleCtrlP = () => {
    if (isAuthRoute) {
      return;
    }
    setIsIndexPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsIndexPopupOpen(false);
  };

  const handleCtrlK = (position: { x: number; y: number; element: Element | null }) => {
    if (isAuthRoute) {
      return;
    }
    setCommandPalettePosition(position);
    setIsCommandPaletteOpen(true);
  };

  const handleCloseCommandPalette = () => {
    setIsCommandPaletteOpen(false);
  };

  const onClose = () => {
    setIsCommandPaletteOpen(false);
  };

  // const handleCommandSubmit = async (command: string) => {
  //   console.log('Command submitted:', command);

  //   // For now, treat all commands as Q&A queries
  //   try {
  //     const response = await inlineQnaApi.answerQuery({
  //       text: command,
  //       cursor_position: { x: commandPalettePosition.x, y: commandPalettePosition.y },
  //       page_id: currentPageId,
  //     });

  //     // Insert the answer at cursor position instead of showing popup
  //     insertTextAtCursor(response.answer);
  //     onClose();

  //   } catch (error) {
  //     console.error('Error getting Q&A answer:', error);
  //     // For now, just close the palette on error
  //     onClose();
  //   }
  // };

  const insertTextAtCursor = (text: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Insert the text at the cursor position
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor to the end of inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // Global keyboard listeners
  useCtrlP({
    onPress: handleCtrlP,
  });

  useCtrlK({
    onPress: handleCtrlK,
  });

  const showSidebar = !isAuthRoute && pathname !== "/" && pathname !== "/dashboard";

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isAuthRoute) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, isAuthRoute, router]);

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-[#191919] text-white">
        {children}
      </div>
    );
  }

  return (
    <>
      {showSidebar && <SlidingSidebar />}
      <div className="transition-all duration-200 ease-out">
        {children}
      </div>
      {/* <IndexSidebarPopup
        open={isIndexPopupOpen}
        onClose={handleClosePopup}
        currentPageId={currentPageId}
      />
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
        position={commandPalettePosition}
        onSubmit={handleCommandSubmit}
      /> */}
    </>
  );
}
