"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface RepoNavigationProps {
  repoId: string;
}

export default function RepoNavigation({ repoId }: RepoNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (!repoId) {
    return (
      <div className="border-b border-white/[0.06]">
        <div className="px-6 py-4">
        </div>
      </div>
    );
  }

  const navItems = [
    {
      label: "Introduction",
      path: `/repo/${repoId}/intro`,
      isActive:
        pathname === `/repo/${repoId}/intro` || pathname === `/repo/${repoId}`,
    },
    {
      label: "Diagram",
      path: `/repo/${repoId}/diagram`,
      isActive: pathname === `/repo/${repoId}/diagram`,
    },
    {
      label: "Overview",
      path: `/repo/${repoId}/cursory_explanation`,
      isActive: pathname === `/repo/${repoId}/cursory_explanation`,
    },
  ];

  return (
    <div className="border-b border-white/[0.06] relative z-50">
      <div className="max-w-5xl mx-auto px-6">
        <nav className="flex gap-6 py-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(item.path);
              }}
              className={`text-[14px] font-mono transition-colors duration-150 relative pb-4 ${
                item.isActive
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              type="button"
            >
              {item.label}
              {item.isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"></div>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
