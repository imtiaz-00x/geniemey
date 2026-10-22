# Roadmap

## In progress — Independent Netlify export (user-approved)
1. Replace the Lovable Vite preset with standard TanStack Start + Nitro Netlify config.
2. Replace Lovable Google OAuth with native Supabase OAuth; drop preview auth bridge + Lovable error reporting.
3. Replace Lovable AI Gateway with an env-configured OpenAI-compatible provider (`openai/gpt-6-astra`).
4. Preserve MCP via standard protocol routes; remove the Lovable MCP package.
5. Add `.env.example`, README, `netlify.toml`, deep-link handling; update platform error text.
6. Remove Lovable-only packages/lockfiles, reinstall, validate build, scan for leftovers, package clean source archive.

## Queued — Materials feature fix brief (uploaded by user)
The brief references `src/routes/_authenticated/materials.tsx` and `src/lib/ai-materials.functions.ts` ("My Materials", file upload + AI processing) — neither exists in this project. Awaiting user confirmation: was this meant for a different repository, or should the Materials feature be built here? Not started until confirmed.
