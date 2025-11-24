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
  const [isMobile, setIsMobile] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const isAuthRoute = pathname?.startsWith("/login");

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // Global keyboard listeners (called unconditionally)
  useCtrlP({
    onPress: handleCtrlP,
  });

  useCtrlK({
    onPress: handleCtrlK,
  });

  const showSidebar = !isAuthRoute && pathname !== "/" && pathname !== "/dashboard";

  // Auth redirect effect (runs unconditionally)
  useEffect(() => {
    if (isLoaded && !isSignedIn && !isAuthRoute) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, isAuthRoute, router]);

  // Show desktop-only message on mobile for non-home paths (after all hooks)
  if (isMobile && pathname !== "/") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#191919] text-white p-4 min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">Desktop/Laptop Only</h1>
          <p className="text-lg text-gray-300">This application supports only desktop and laptop screens, except for the home page. Please use a larger screen for full access.</p>
        </div>
      </div>
    );
  }

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
