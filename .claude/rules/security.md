# Security Rules — OTONAMI

- NEVER hardcode API keys, tokens, or passwords in source code
- NEVER log sensitive values (keys, tokens, passwords, user emails)
- All secrets in Vercel env vars; client-side can only access NEXT_PUBLIC_*
- Verify JWT in every protected API route before processing
- Hash passwords with bcryptjs (cost factor 10)
- Never return password hashes in API responses
- Validate all user input at API route boundaries
- Sanitize strings before Supabase inserts
- All Supabase queries server-side in Route Handlers
- Use SUPABASE_SERVICE_ROLE_KEY only for admin operations
- RapidAPI key, Anthropic API key, Stripe secret: server-side only
- RLS must be enabled on all tables before production launch
