# Git Workflow — OTONAMI

- Before changes: cd ~/otonami && git stash && git pull
- Before edits: grep -n to verify file structure
- Commit format: <type>: <description> (feat/fix/refactor/docs/test/chore/perf)
- After changes: git add -A && git commit && git push
- OtonamiApp.jsx: git stash before, edit specific section only, test, commit immediately
- Schema changes: ALTER TABLE in Supabase SQL Editor → NOTIFY pgrst → update CLAUDE.md → commit code
