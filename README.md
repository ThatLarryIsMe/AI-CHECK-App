# ProofMode AI Monorepo

This repository is bootstrapped as a pnpm + Turborepo workspace.

## Workspace layout

- `apps/web` — Next.js 14 App Router app with TypeScript and Tailwind CSS
- `packages/core` — shared TypeScript library with Zod schemas
- `packages/docs` — placeholder package
- `packages/infra` — placeholder package
- `docs` — architecture and decision logs
- `infra/db` — database SQL schema files

## Requirements

- Node.js 20+
- pnpm 9+

## Commands

```bash
pnpm install
pnpm build
pnpm --filter web dev
```
