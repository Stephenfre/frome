# ForMe

ForMe is a Mac-first personal command center starter built with Next.js App Router, TypeScript, Convex, Clerk, Tailwind CSS, and shadcn/ui.

It includes a public landing page, custom Clerk sign-in/sign-up routes, a protected dashboard, Clerk-backed Convex authentication, and starter Convex tables/functions for users, tasks, events, and daily briefs.

## Tech Stack

- Next.js App Router
- TypeScript
- Convex
- Clerk
- Tailwind CSS
- shadcn/ui
- ESLint
- Prettier

## Getting Started

Install dependencies:

```bash
npm install
```

Create a Clerk application:

1. Go to the Clerk dashboard and create a new application.
2. Choose the sign-in methods you want for ForMe.
3. Activate the Clerk Convex integration.
4. Copy the Clerk publishable key and secret key.
5. Copy the Clerk Frontend API URL. For this starter, the development issuer is `https://certain-stud-66.clerk.accounts.dev`.

Create a Convex project:

```bash
npx convex dev
```

Follow the prompts to create or select a Convex project. Convex will write `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.

Set environment variables:

```bash
cp .env.local.example .env.local
```

Then update `.env.local` with your real values:

```bash
CONVEX_DEPLOYMENT=dev:your-project-name
NEXT_PUBLIC_CONVEX_URL=https://your-project-name.convex.cloud

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
CLERK_FRONTEND_API_URL=https://certain-stud-66.clerk.accounts.dev
CLERK_JWT_ISSUER_DOMAIN=https://certain-stud-66.clerk.accounts.dev
```

Configure Convex to trust Clerk tokens:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://certain-stud-66.clerk.accounts.dev
```

Run Convex dev:

```bash
npm run convex:dev
```

In another terminal, run the Next.js dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/` public landing page
- `/dashboard` protected dashboard
- `/sign-in/[[...sign-in]]` Clerk sign-in route
- `/sign-up/[[...sign-up]]` Clerk sign-up route

## Convex Files

- `convex/auth.config.ts` validates Clerk-issued Convex tokens.
- `convex/schema.ts` defines `users`, `tasks`, `events`, and `dailyBriefs`.
- `convex/users.ts` includes `getCurrentUser` and `upsertCurrentUser`.
- `convex/tasks.ts` includes `createTask` and `listTodaysTasks`.
- `convex/events.ts` and `convex/dailyBriefs.ts` are starter backend modules for future wiring.

The checked-in `convex/_generated` files let the starter type-check before your first Convex run. `npm run convex:dev` regenerates them.

## Auth Flow

Clerk wraps the app in `src/app/layout.tsx`. Convex auth is provided by `src/components/providers/convex-client-provider.tsx`, which uses `ConvexProviderWithClerk`.

`src/proxy.ts` uses Clerk middleware to protect `/dashboard`. Next.js 16 uses the `proxy.ts` file convention instead of `middleware.ts`.

After a user signs in, `src/components/providers/user-sync.tsx` calls `api.users.upsertCurrentUser` so the Clerk user exists in Convex.

## Useful Commands

```bash
npm run dev
npm run convex:dev
npm run lint
npm run format
npm run format:check
npm run build
```
