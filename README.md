This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## OP Tools dashboard

- The landing page (`/`) is now the OP Tools internal console. It lists every hosted website (mocked data for now), exposes history snapshots, and exposes a payload editor that handles the entire Siteframe output described in the request.
- Use `npm run dev` to spin up the dashboard. Set `NEXT_PUBLIC_N8N_WEBHOOK_BASE` in `.env.local` to point at your n8n workspace so the create / regenerate / redeploy buttons become real POST requests.
- The UI uses the `components/ui/*` helpers (derived from shadcn) so you can reuse buttons, cards, selects, and textareas throughout the dashboard.

## Supabase configuration

- The UI is powered by Supabase data pulled from `websites`/`websites_history`, so you must provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your environment before running the project. These server-only credentials are required to read and list every row for the internal dashboard.
- Service role keys are powerful and should never be exposed to the browser or committed to source control; keep them in `.env.local` or Secrets Manager and never prefix them with `NEXT_PUBLIC_`.
- Because the login page uses Supabase Auth, you now also need `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` so the browser can sign in without leaking the service role key.
- The `.env.example` file documents all four values, and the dashboard will surface an error if the server-side vars are missing so you can configure a valid Supabase project.

## Login page

- Visit `/login` to sign in using the Supabase email/password flow. The page is intentionally minimal because the product is internal, and it will redirect to `/` after success.
- If signing in fails, the form surface the Supabase error message so you know whether to reset your password or check the credentials.

## Supabase migrations

- Thanks for scaffolding the `supabase/migrations` directory. The base migration file at `supabase/migrations/00000000000000_base.sql` should be populated with the current schema export whenever you are ready to commit the real `websites` / `websites_history` tables and triggers.
- Once the migration matches the schema tracked in Supabase, future changes can be captured in additional sequential migration files.
