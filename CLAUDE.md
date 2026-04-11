# OTONAMI — Claude Code Project Instructions

## Project Overview

OTONAMI (otonami.io) is an AI-powered music pitch platform connecting Japanese independent artists with international curators (playlist editors, music bloggers, radio DJs, label scouts). Japanese-market alternative to Groover/SubmitHub.

## Tech Stack

- **Framework**: Next.js 14 (App Router) — NO Pages Router
- **Database**: Supabase (PostgreSQL, Tokyo region) — queries run server-side in Route Handlers
- **Deploy**: Vercel (Hobby plan, 1 cron max)
- **Domain**: otonami.io (Cloudflare DNS)
- **AI**: Anthropic Claude API (pitch text generation, caption generation)
- **Audio Analysis**: DJ Track Audio Analysis API via RapidAPI (primary), Spotify Extended Audio Features (search fallback), SoundNet (final fallback) — all Basic free (10 req/day)
- **Email**: Resend (info@otonami.io)
- **Auth**: bcryptjs + jose (JWT) — `artist_token` and `curator_token` in localStorage separately
- **Payments**: Stripe (test mode)
- **SNS Promo**: Placid.app ($15/month) for card generation
- **Fonts**: Sora (headings) + DM Sans (body)
- **Colors**: #FF6B4A (coral), #FF3D6E (pink), #A78BFA (purple), #4ECDC4 (teal), #c4956a (gold)

## Repository Structure

app/ — App Router pages (page.js, curator/, api/)
components/OtonamiApp.jsx — Main UI (2000+ lines, edit surgically)
lib/ — supabase.js, db.js, match-score.js
public/ — Static assets, OGP images

## Critical Schema Facts

The actual Supabase columns differ from schema.sql:
- pitches.title → actual column is `subject`
- credit_cost → actual column is `tier`
- pitch_id type → TEXT (not UUID)
- paypal_email → actual column is `payment_info`
- payment_method column added (TEXT): PayPal / Wise / Bank Transfer

Curator earnings: tier × ¥160 × 0.7 (accepted) or tier × ¥160 × 0.5 (feedback/declined)
JWT contains curator_id; old tokens fall back to email lookup.

## Development Workflow

1. `cd ~/otonami && git stash` before any changes
2. `grep -n "target" file.js` before editing (verify structure)
3. Make changes
4. `git add -A && git commit -m "<type>: <desc>" && git push`

Commit types: feat, fix, refactor, docs, test, chore, perf

## Rules

- JavaScript only (no TypeScript)
- Server Components by default; 'use client' only when needed
- All Supabase queries in Route Handlers (server-side)
- NEVER hardcode secrets
- Avoid .single() on Supabase — use ID-based lookups
- OtonamiApp.jsx: NEVER rewrite entirely, edit specific sections only
- After ALTER TABLE: run NOTIFY pgrst, 'reload schema' in SQL Editor
- Mobile-first: 375px min width, word-break:keep-all scoped to headings at 768px+
- Logo SVG must be inline (not img tag)
