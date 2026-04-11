# Coding Style — OTONAMI

- JavaScript only (match existing codebase), const > let, no var
- Async/await over raw Promises
- Server Components by default; 'use client' only for hooks/browser APIs
- NextResponse.json() in Route Handlers
- Functional components only, useState/useEffect/useCallback
- Inline styles with design tokens from lib/design-tokens.js
- Brand: coral #FF6B4A, pink #FF3D6E, purple #A78BFA, teal #4ECDC4, gold #c4956a
- Fonts: Sora (headings), DM Sans (body)
- Mobile-first 375px min, word-break:keep-all scoped to headings 768px+
- Try/catch every async op; API routes return { error: "message" }
- camelCase vars/functions, PascalCase components, UPPER_SNAKE_CASE constants
- Max 400 lines for new files. OtonamiApp.jsx is legacy exception
