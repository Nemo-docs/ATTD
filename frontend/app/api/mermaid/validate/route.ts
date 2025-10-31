import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * POST /api/mermaid/validate
 * Validates Mermaid diagram syntax
 * 
 * Request body: { mermaidCode: string }
 * Response: { isValid: boolean, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const payloadSchema = z.object({
      mermaidCode: z.string().min(1).max(100_000),
    });

    const parseResult = payloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { isValid: false, error: 'Invalid payload: mermaidCode must be a non-empty string' },
        { status: 400 }
      );
    }

    let { mermaidCode } = parseResult.data;

    // Strip markdown fences if present
    mermaidCode = mermaidCode
      .replace(/^```\s*mermaid\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    // Extract the first diagram keyword to select parser
    const firstKeyword = (() => {
      const lines = mermaidCode.split(/\r?\n/);
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (line.startsWith('%%')) continue; // ignore Mermaid comments/directives
        // handle init directive like %%{init: {...}}%% placed inline
        const sanitized = line.replace(/^%%\{.*?\}%%\s*/i, '').trim();
        if (!sanitized) continue;
        const match = sanitized.match(/^[A-Za-z][A-Za-z0-9_-]*/);
        if (match) return match[0];
        return undefined;
      }
      return undefined;
    })();

    const modernTypes = new Set([
      'info',
      'packet',
      'pie',
      'architecture',
      'gitgraph', // allow lowercase detection; map to gitGraph
      'gitGraph',
      'radar',
      'treemap',
    ]);

    // Lightweight DOM shim for mermaid in Node runtime
    if (typeof (globalThis as any).window === 'undefined') {
      const { JSDOM } = await import('jsdom');
      const dom = new JSDOM('<div id="container"></div>');
      (globalThis as any).window = dom.window as any;
      (globalThis as any).document = dom.window.document as any;
      (globalThis as any).navigator = { userAgent: 'node.js' } as any;
      (globalThis as any).HTMLElement = (dom.window as any).HTMLElement;
      (globalThis as any).SVGElement = (dom.window as any).SVGElement;
    }

    // create a DOMPurify instance bound to the JSDOM window (dompurify exports a factory)
    try {
      const DOMPurifyModule = await import('dompurify');
      const createDOMPurify = (DOMPurifyModule as any).default ?? DOMPurifyModule;
      const dompurifyInstance = createDOMPurify((globalThis as any).window);
      (globalThis as any).DOMPurify = dompurifyInstance;
      // ESM/Turbopack interop: some consumers access DOMPurify.default.addHook
      if (!(globalThis as any).DOMPurify.default) {
        (globalThis as any).DOMPurify.default = dompurifyInstance;
      }
      // Also patch the module's default export object used by bundlers expecting instance methods
      const moduleDefault = (DOMPurifyModule as any).default;
      if (moduleDefault && (typeof moduleDefault === 'function' || typeof moduleDefault === 'object')) {
        if (!(moduleDefault as any).addHook && (dompurifyInstance as any).addHook) {
          (moduleDefault as any).addHook = (dompurifyInstance as any).addHook.bind(dompurifyInstance);
        }
        if (!(moduleDefault as any).sanitize && (dompurifyInstance as any).sanitize) {
          (moduleDefault as any).sanitize = (dompurifyInstance as any).sanitize.bind(dompurifyInstance);
        }
      }
    } catch (err) {
      console.log('DOMPurify import failed:', (err as any)?.message || err);
    }

    // Load mermaid AFTER DOM + DOMPurify are ready; then initialize (idempotent)
    let mermaid: any;
    try {
      mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    } catch {
      // ignore repeated initialization errors
      console.log('Mermaid initialization failed');
    }

    // Validate syntax using mermaid's parser
    try {
      // Prefer the modern standalone parser when the diagram type is supported
      if (firstKeyword && modernTypes.has(firstKeyword)) {
        try {
          const parserModule: any = await import('@mermaid-js/parser');
          const parseFn: any = parserModule.parse ?? parserModule.default?.parse ?? parserModule;
          const diagramType = firstKeyword === 'gitgraph' ? 'gitGraph' : firstKeyword;
          await parseFn(diagramType, mermaidCode);
          return NextResponse.json({ isValid: true });
        } catch (e: any) {
          // If modern parser reports a parse error, return it; otherwise fall back
          const message = e?.message || String(e);
          if (message) {
            return NextResponse.json({ isValid: false, error: message });
          }
          // fallthrough to classic mermaid parser
        }
      }

      // Fall back to mermaid's built-in parser
      const maybeParse = (mermaid as any).parse ?? (mermaid as any).mermaidAPI?.parse;
      if (typeof maybeParse !== 'function') {
        throw new Error('Mermaid parser not available');
      }

      const result = await maybeParse(mermaidCode);

      if (result === false) {
        return NextResponse.json({ isValid: false, error: 'Invalid Mermaid syntax' });
      }

      return NextResponse.json({ isValid: true });
    } catch (err: any) {
      const message = typeof err?.str === 'string' ? err.str : err?.message || String(err);
      console.log('Mermaid validation error:', message);
      return NextResponse.json({ isValid: false, error: message });
    }
  } catch (e: any) {
    console.log('Mermaid validation error:', e?.message || 'Unexpected error');
    return NextResponse.json(
      { isValid: false, error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

