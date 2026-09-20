# Independent Netlify deployment

## Outcome
Prepare GenieMey AI as a portable TanStack Start application that deploys on Netlify without Lovable-only runtime dependencies, while preserving its existing pages, authentication, database, AI features, MCP tools, and UI.

## Work
1. Replace the Lovable Vite preset with standard TanStack Start, React, Tailwind, path aliases, and Nitro configured for Netlify.
2. Replace Lovable-hosted Google OAuth with the database provider's native Google OAuth flow; remove preview-only auth bridging and Lovable error reporting.
3. Replace Lovable AI Gateway calls with an environment-configured OpenAI-compatible provider using the required `openai/gpt-6-astra` model and server-only credentials.
4. Preserve MCP functionality through standard MCP protocol routes and existing authenticated tools, removing the Lovable MCP package and consent dependencies only where necessary.
5. Add environment documentation, Netlify build configuration, SPA/deep-link handling, and update platform-specific error text.
6. Remove Lovable-only packages and lockfiles, install portable dependencies, validate the build, scan for remaining Lovable URLs/references, and create a clean downloadable source archive excluding secrets, dependencies, and generated output.

## Technical details
- Netlify build command: `npm run build`.
- Netlify publish directory: `dist` with generated server function output included by Nitro.
- Required environment variables will be documented in `.env.example` and `README.md`; real credentials will remain outside the source archive.
- No changes to application data, routes, visual design, branding, or user-facing functionality are planned.
