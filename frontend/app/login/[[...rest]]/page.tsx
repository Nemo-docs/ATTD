"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import type { Appearance } from "@clerk/types";
import { cn } from "@/lib/utils";

const clerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: "bottom",
    helpPageUrl: "https://clerk.com/help",
  },
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "rgba(0, 0, 0, 0.25)",
    colorInputText: "rgba(255, 255, 255, 0.92)",
    colorPrimary: "#007aff",
    borderRadius: "16px",
  },
  elements: {
    rootBox:
      "!w-full !max-w-none !p-0 !overflow-hidden !shadow-none !flex !items-center !justify-center",
    card: "!shadow-none !bg-transparent !w-full",
    cardBox:
      "!shadow-none !bg-transparent !flex !flex-col !items-center !justify-center !w-full gap-6 ",
    formButtonPrimary:
      "!bg-[#007aff] !text-white !font-medium hover:!bg-[#0051d5] active:!bg-[#003d99] transition-all duration-200 !rounded-[12px] !shadow-[0_8px_24px_rgba(0,122,255,0.2)] !w-full !h-12 !text-sm !border-none",
    formFieldInput:
      "!bg-rgba(0,0,0,0.25) !border !border-[rgba(255,255,255,0.22)] !text-white !placeholder-zinc-500 focus:!border-[rgba(255,255,255,0.35)] !rounded-[12px] focus:!shadow-[0_0_0_0px_rgba(0,122,255,0.1)] transition-all !w-full !h-12 !text-sm",
    formFieldLabel: "!text-[rgba(255,255,255,0.92)] !text-[13px] !font-medium !mb-2",
    socialButtonsBlockButton:
      "!border !border-[rgba(255,255,255,0.22)] !bg-rgba(0,0,0,0.25) !text-white hover:!bg-rgba(255,255,255,0.08) !rounded-[12px] transition-all !shadow-none !w-full !h-12 !text-sm !backdrop-blur-[20px]",
    socialButtonsProviderIcon__github: "!text-white !bg-transparent",
    socialButtonsProviderIcon__google: "!text-white !bg-transparent",
    socialButtonsBlockButton__google:
      "!border !border-[rgba(255,255,255,0.22)] !bg-rgba(0,0,0,0.25) !text-white hover:!bg-rgba(255,255,255,0.08) !rounded-[12px] transition-all !shadow-none !w-full !h-12 !text-sm",
    socialButtonsBlockButton__github:
      "!border !border-[rgba(255,255,255,0.22)] !bg-rgba(0,0,0,0.25) !text-white hover:!bg-rgba(255,255,255,0.08) !rounded-[12px] transition-all !shadow-none !w-full !h-12 !text-sm",
    footerActionLink: "!text-[#007aff] hover:!text-[#0051d5] !text-xs transition-colors duration-200",
    headerTitle: "!text-[rgba(255,255,255,0.92)] !text-base !font-semibold !mb-1",
    headerSubtitle: "!text-[rgba(255,255,255,0.68)] !text-[13px] !mb-4",
    dividerLine: "!bg-[rgba(255,255,255,0.12)]",
    dividerText: "!text-[rgba(255,255,255,0.68)] !text-xs",
    formResendCodeLink: "!text-[#007aff] hover:!text-[#0051d5] !text-xs transition-colors duration-200",
    alertBox: "!bg-rgba(0,0,0,0.25) !border !border-[rgba(255,255,255,0.22)] !rounded-[12px] !w-full !text-xs",
    formFieldErrorText: "!text-[#ff3b30] !text-xs",
    footer: "!hidden",
    footerText: "!hidden",
    signUpLink: "!text-[#007aff] hover:!text-[#0051d5] transition-colors duration-200",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const modeFromQuery =
    searchParams?.get("mode") === "signup" ? "signup" : "signin";
  const [authMode, setAuthMode] = useState<"signin" | "signup">(modeFromQuery);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    setAuthMode(modeFromQuery);
  }, [modeFromQuery]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#191919] text-white">
        <span className="text-sm text-zinc-400">Preparing login...</span>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12 text-white relative"
      style={{ 
        backgroundImage: "url('/login_4_bg_screen.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0" />
      <div className="w-full max-w-md relative z-10 backdrop-blur-md">
        <div className="overflow-hidden rounded-[26px] px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          {/* Tab Navigation */}
          <div className="flex gap-2 rounded-lg  p-1 mb-6">
            {[
              { id: "signin", label: "Sign in" },
              { id: "signup", label: "Create account" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAuthMode(tab.id as "signin" | "signup")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md font-medium text-[13px] transition-all duration-200",
                  authMode === tab.id
                    ? "bg-[#6c47ff] text-white shadow-[0_2px_8px_rgba(108,71,255,0.2)]"
                    : "text-zinc-400 hover:text-zinc-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Auth Form */}
          <div className="w-full rounded-lg p-4 flex items-center justify-center ">
            <div className="flex flex-col items-center justify-center w-full width: 100%">
              {authMode === "signin" ? (
                <SignIn
                  appearance={clerkAppearance}
                  afterSignInUrl="/"
                  signUpUrl="/login?mode=signup"
                />
                // <>Sign in</>
              ) : (
                <SignUp
                  appearance={clerkAppearance}
                  afterSignUpUrl="/"
                  signInUrl="/login?mode=signin"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

