"use client";

import React, { useRef, useState, forwardRef, useCallback, useEffect } from "react";
import HTMLFlipBook from "react-pageflip";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  Zap,
  RefreshCw,
  Puzzle,
  FileCode2,
  Link2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  // Sparkles,
  Terminal,
  // Bot,
  Users,
  Search,
  Clock,
  PenLine,
} from "lucide-react";

import { useRouter } from 'next/navigation';

// Page component for the flip book
const Page = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`h-full w-full ${className}`}>
      {children}
    </div>
  )
);
Page.displayName = "Page";

// Feature data
const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Document & retrieve in seconds",
    color: "text-blue-400",
  },
  {
    icon: RefreshCw,
    title: "Auto-Update",
    desc: "Docs sync with code changes",
    color: "text-purple-400",
  },
  {
    icon: Puzzle,
    title: "MCP Integration",
    desc: "Native AI tool protocol support",
    color: "text-purple-400",
  },
  {
    icon: FileCode2,
    title: "Rust Notepad",
    desc: "Blazing fast local editor",
    color: "text-blue-400",
  },
  {
    icon: Link2,
    title: "Connectors",
    desc: "GitHub, Slack, Notion & more",
    color: "text-purple-400",
  },
  {
    // icon: Bot,
    title: "AI-Native",
    desc: "Built for AI + human collab",
    color: "text-purple-400",
  },
];

// Comparison data
const comparison = [
  { current: "No context awareness", ours: "Full codebase context" },
  { current: "AI feels like an afterthought", ours: "AI-native from day one" },
  { current: "Good luck finding stale docs", ours: "Auto-updated, always fresh" },
  { current: "WTH is MCP?", ours: "Native MCP integration" },
  { current: "Built only for humans", ours: "AI + Human collaboration" },
  { current: "Manual sync nightmare", ours: "Git-aware auto-sync" },
];

export default function Home() {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  const handleInit = useCallback(() => {
    if (flipBookRef.current) {
      setTotalPages(flipBookRef.current.pageFlip()?.getPageCount() || 0);
    }
  }, []);

  const goNext = () => flipBookRef.current?.pageFlip()?.flipNext();
  const goPrev = () => flipBookRef.current?.pageFlip()?.flipPrev();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Image 
            src="/nemo_logo.svg"
            alt="Nemo Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-lg font-bold tracking-tight">Nemo</span>
        </div>
        {/* <Button 
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-black font-semibold hover:opacity-90 transition-opacity px-6"
          onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Get Started
        </Button> */}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-8 pt-12 sm:pt-20 pb-12 sm:pb-16 max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8">
            <PenLine className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-zinc-400">Documentation for dev teams</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight max-w-4xl mx-auto">
            {/* <span className="text-zinc-400">We handle docs.</span> */}
            {/* <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              You ship features.
            </span> */}
            {/* <br /> */}
            <blockquote className="text-center">
              <span className="block text-4xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-bold mb-2">
                “I love writing docs”
              </span>
              <cite className="text-base sm:text-lg text-zinc-500 not-italic block">
                — said no dev ever
              </cite>
            </blockquote>

          </h1>
          
          {/* <p className="text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto mb-3 sm:mb-4">
          “I love writing docs” — said no dev ever
          </p> */}
          
          

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="bg-transparent border-white/20 text-white hover:bg-white/5 px-6 sm:px-8 py-4 sm:py-6"
              onClick={() => window.open('https://cal.com/nemo-meet', '_blank')}
            >
              Meet the Founders 
              {/* <ArrowRight className="w-5 h-5 ml-2" /> */}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white/20 text-zinc-300 hover:bg-white/5 px-6 sm:px-8 py-4 sm:py-6"
              onClick={() => router.push('/login')}
            >
              <Terminal className="w-5 h-5 mr-2" />
              Sign Up
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive Book Demo */}
      <section className="relative z-10 py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">See it in action</h2>
            <p className="text-zinc-500">Flip through to explore our features</p>
          </div>

          <div className="flex flex-col items-center w-full max-w-lg mx-auto">
            <HTMLFlipBook
              ref={flipBookRef}
              width={isMobile ? 350 : 600}
              height={isMobile ? 450 : 900}
              size="stretch"
              minWidth={isMobile ? 320 : 400}
              maxWidth={isMobile ? 380 : 600}
              minHeight={isMobile ? 420 : 450}
              maxHeight={isMobile ? 480 : 900}
              maxShadowOpacity={0.4}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={handleFlip}
              onInit={handleInit}
              className="shadow-2xl"
              style={{}}
              startPage={1} // <--- keep it open from page 1 at beginning (skips the cover)
              drawShadow={true}
              flippingTime={600}
              usePortrait={isMobile}
              startZIndex={0}
              autoSize={true}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={30}
              showPageCorners={true}
              disableFlipByClick={false}
            >
              {/* Cover */}
              <Page className="bg-gradient-to-br from-[#0d1117] to-[#161b22] rounded-r-lg overflow-hidden">
                <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 relative" data-density="hard">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.1),transparent_50%)]" />
                  <Image 
                    src="/nemo_logo.svg"
                    alt="Nemo Logo"
                    width={80}
                    height={80}
                    className="mb-6 "
                  />
                  <h2 className="text-3xl font-bold mb-2 text-center">Nemo</h2>
                  <p className="text-zinc-500 text-center text-sm">Automated Technical Documentation</p>
                  <div className="mt-8 flex items-center gap-2 text-xs text-zinc-600">
                    <ChevronRight className="w-4 h-4 animate-pulse" />
                    <span>Click or drag to flip</span>
                  </div>
                </div>
              </Page>

              {/* Feature 1: Speed */}
              <Page className="bg-[#0d1117]">
                <div className="h-full p-4 sm:p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    {/* <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-blue-400" />
                    </div> */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold">Lightning Fast</h3>
                      <p className="text-zinc-500 text-sm">Document in seconds</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#161b22] rounded-lg p-4 font-mono text-sm">
                    <div className="text-zinc-500 mb-2">{`// Before: 30 minutes`}</div>
                    <div className="text-zinc-600 line-through mb-4">Writing docs manually...</div>
                    <div className="text-emerald-400 mb-2">{`// After: 30 seconds`}</div>
                    <div className="text-violet-300">
                      <span className="text-violet-400">Nemo generate ./src docs</span>
                      {/* <span className="text-zinc-400"> generate </span> */}
                      {/* <span className="text-purple-400">./src/dashboard/page.tsx docs</span> */}
                    </div>
                    <div className="mt-4 text-xs text-zinc-500">
                      ✓ 47 files documented<br/><br/>
                      ✓ 12 runbooks generated<br/><br/>
                      ✓ API reference created<br/><br/>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 text-xs text-zinc-600 text-center">1 / 6</div>
                </div>
              </Page>

              {/* Feature 2: Auto-Update */}
              <Page className="bg-[#0d1117]">
                <div className="h-full p-4 sm:p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    {/* <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-purple-400" />
                    </div> */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold">Auto-Update</h3>
                      <p className="text-zinc-500 text-sm">Always in sync</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#161b22] rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-2 bg-violet-500/10 rounded border border-violet-500/20">
                        <div className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="text-sm">PR #142 merged</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-purple-500/10 rounded border border-purple-500/20">
                        <RefreshCw className="w-4 h-4 text-purple-400" />
                        <span className="text-sm">Docs auto-updating...</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-indigo-500/10 rounded border border-indigo-500/20">
                        {/* <Sparkles className="w-4 h-4 text-indigo-400" /> */}
                        <span className="text-sm">3 pages refreshed</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-500">
                      No more stale documentation.
                      <br /><br />
                      Changes trigger automatic updates.
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 text-xs text-zinc-600 text-center">2 / 6</div>
                </div>
              </Page>

              {/* Feature 3: MCP */}
              <Page className="bg-[#0d1117]">
                <div className="h-full p-4 sm:p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    {/* <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Puzzle className="w-6 h-6 text-purple-400" />
                    </div> */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold">MCP Native</h3>
                      <p className="text-zinc-500 text-sm">AI tool protocol</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#161b22] rounded-lg p-4 font-mono text-xs">
                    <div className="text-zinc-500 mb-3">{`// mcp.config.json`}</div>
                    <pre className="text-sm leading-relaxed">
{`{
  "tools": [{
    "name": "search_docs",
    "endpoint": "/mcp/search"
  }, {
    "name": "update_runbook",
    "endpoint": "/mcp/update"
  }]
}`}
                    </pre>
                    <div className="mt-4 p-2 bg-violet-500/10 rounded text-violet-300 text-xs">
                      Works with Claude, GPT, and any MCP-compatible AI
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 text-xs text-zinc-600 text-center">3 / 6</div>
                </div>
              </Page>

              {/* Feature 4: Rust Notepad */}
              <Page className="bg-[#0d1117]">
                <div className="h-full p-4 sm:p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    {/* <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <FileCode2 className="w-6 h-6 text-blue-400" />
                    </div> */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold">Rust Notepad</h3>
                      <p className="text-zinc-500 text-sm">Blazing fast editor</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#161b22] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                      <span className="text-sm">snippets</span>
                      <span className="text-xs text-emerald-400">● Saved</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="text-zinc-400"># Benchmarks</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Startup time:</span>
                        <span className="text-orange-400">{"<"}10ms</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">File open:</span>
                        <span className="text-orange-400">{"<"}5ms</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Memory usage:</span>
                        <span className="text-orange-400">~30MB</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-500">
                      Built with Rust for native performance.
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 text-xs text-zinc-600 text-center">4 / 6</div>
                </div>
              </Page>

              {/* Feature 5: Connectors */}
              <Page className="bg-[#0d1117]">
                <div className="h-full p-4 sm:p-8 flex flex-col"  data-density="hard">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    {/* <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Link2 className="w-6 h-6 text-purple-400" />
                    </div> */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold">Connectors</h3>
                      <p className="text-zinc-500 text-sm">Integrate everything</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      {['GitHub', 'GitLab', 'Slack', 'Notion', 'Jira', 'Linear'].map((name) => (
                        <div key={name} className="bg-[#161b22] rounded-lg p-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-bold">
                            {name[0]}
                          </div>
                          <span className="text-sm">{name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-xs text-zinc-500">
                      + 20 more integrations coming soon
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-4 text-xs text-zinc-600 text-center">5 / 6</div>
                </div>
              </Page>

              {/* Back Cover */}
              <Page className="bg-gradient-to-br from-[#0d1117] to-[#161b22] rounded-l-lg overflow-hidden">
                <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 relative" data-density="hard">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]" onClick={() => router.push('/login')}/>
                  {/* <Bot className="w-16 h-16 text-purple-400 mb-6" /> */}
                  <h2 className="text-2xl font-bold mb-2 text-center">Ready to ship faster?</h2>
                  <Button 
                    className="bg-gradient-to-r from-violet-500 to-purple-500 text-black font-semibold"
                  >
                    Sign Up
                  </Button>
                </div>
              </Page>
            </HTMLFlipBook>

            {/* Navigation Controls */}
            {/* <div className="flex items-center gap-6 mt-8">
              <button 
                onClick={goPrev}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-zinc-500 font-mono">
                {currentPage + 1} / {totalPages || '...'}
              </span>
              <button 
                onClick={goNext}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div> */}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      {/* <section className="relative z-10 py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-zinc-500">Built for developers, by developers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-current/10 flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Comparison Table */}
      <section className="relative z-10 py-16 sm:py-20 px-4 sm:px-8 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Why switch?</h2>
            <p className="text-zinc-500">The old way vs. the Nemo way</p>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Left Column: Current Approach */}
              <div className="flex-1 border-r-0 sm:border-r border-white/10">
                {/* Current Header */}
                <div className="p-3 sm:p-4 bg-white/5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-zinc-400">Current Approach</span>
                  </div>
                </div>
                {/* Current Rows */}
                {comparison.map((row, i) => (
                  <div 
                    key={`left-${i}`}
                    className={`flex items-center gap-3 p-3 sm:p-4 ${
                      i !== comparison.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    <span className="text-red-400/60">✗</span>
                    <span className="text-zinc-500 text-sm">{row.current}</span>
                  </div>
                ))}
              </div>

              {/* Right Column: Nemo */}
              <div className="flex-1">
                {/* Nemo Header */}
                <div className="p-3 sm:p-4 bg-white/5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-400">Nemo</span>
                  </div>
                </div>
                {/* Nemo Rows */}
                {comparison.map((row, i) => (
                  <div 
                    key={`right-${i}`}
                    className={`flex items-center gap-3 p-3 sm:p-4 ${
                      i !== comparison.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    <span className="text-blue-400">✓</span>
                    <span className="text-zinc-300 text-sm">{row.ours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Testimonials Section */}
      <section className="relative z-10 py-16 sm:py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">What people are saying</h2>
            {/* <p className="text-zinc-500 max-w-2xl mx-auto">Real teams, real results. Nemo is transforming how engineering teams document their code.</p> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 hover:bg-white/10 transition-colors">
              <p className="text-zinc-400 italic mb-6 text-sm leading-relaxed">
                &quot;We dont need Nemo, we love to send 300 pages of docs to new onboarding engineers.&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-400 font-semibold text-sm">EA</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Evan Aaronson</div>
                  <div className="text-zinc-500 text-sm">VP, LMAO</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 hover:bg-white/10 transition-colors">
              <p className="text-zinc-400 italic mb-6 text-sm leading-relaxed">
                &quot;We dont write docs, because we are too busy in finding the code and understanding the intent.&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 font-semibold text-sm">BS</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Chris Matthews</div>
                  <div className="text-zinc-500 text-sm">Head of Engineering, LOL</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 hover:bg-white/10 transition-colors">
              <p className="text-zinc-400 italic mb-6 text-sm leading-relaxed">
                &quot;Docs hell no bro, see how I can just send emails and waste hours waiting for response.&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                  <span className="text-emerald-400 font-semibold text-sm">CD</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Josep Puig</div>
                  <div className="text-zinc-500 text-sm">Strategic Leader, LMFAO</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      {/* <section className="relative z-10 py-16 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">500+</div>
              <div className="text-xs text-zinc-500 mt-1">Teams</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">10k+</div>
              <div className="text-xs text-zinc-500 mt-1">Docs Generated</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">80%</div>
              <div className="text-xs text-zinc-500 mt-1">Time Saved</div>
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section id="cta" className="relative z-10 py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.15),transparent_50%)]" />
            
            <div className="relative">
              <div className="flex items-center justify-center gap-4 mb-4 sm:mb-6">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Meet the Founders</h2>
              <p className="text-zinc-500 mb-6 sm:mb-8 max-w-md mx-auto">
                We&apos;re developers who got tired of documentation hell. Let&apos;s chat about how Nemo can help your team.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button 
                  size="lg"
                  className="bg-transparent border-white/20 text-white hover:bg-white/5 px-6 sm:px-8 py-4 sm:py-6"
                  onClick={() => window.open('https://cal.com/nemo-meet', '_blank')}
                >
                  Meet the Founders 
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-white/20 text-zinc-300 hover:bg-white/5 px-6 sm:px-10 py-4 sm:py-6"
                  onClick={() => router.push('/login')}
                >
                  Sign Up
                </Button>
              </div>
              
              <p className="text-xs text-zinc-600 mt-4 sm:mt-6 font-mono">
                // No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 sm:py-12 px-4 sm:px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <Image 
              src="/nemo_logo.svg"
              alt="Nemo Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-semibold">Nemo</span>
            <span className="text-zinc-600 text-sm">© 2025</span>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
