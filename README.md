# Tokens This Week

Tokens This Week is a Next.js 15 App Router SaaS for engineering managers who need weekly visibility into team AI spend before optimization work.

## What it does

- Connect encrypted read-only OpenAI + Anthropic API keys
- Run weekly usage ingestion + waste detection via cron
- Email weekly summary via Resend
- Show dashboard with:
  - total spend
  - waste patterns
  - top expensive prompt flows
  - cost-per-developer breakdown
- Gate dashboard access behind Stripe payment + cookie session unlock

## Stack

- Next.js 15 + App Router + TypeScript
- Tailwind CSS v4
- Supabase (storage)
- Resend (email)
- Stripe Payment Link + webhook
- Recharts (dashboard charts)

## Environment

Copy `.env.example` to `.env.local` and set values.

## Required Supabase tables

```sql
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  team_size int default 8,
  subscription_status text default 'pending_checkout',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic')),
  key_name text not null,
  encrypted_key text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (team_id, provider)
);

create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  week_start timestamptz not null,
  week_end timestamptz not null,
  generated_at timestamptz not null,
  summary jsonb not null,
  created_at timestamptz default now(),
  unique (team_id, week_start)
);
```

## Local development

```bash
npm install
npm run dev
```

## Cron endpoint

Trigger weekly analysis:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/analyze-usage
```

## Stripe webhook

Configure Stripe to send events to:

`POST /api/webhooks/lemonsqueezy`

Supported events:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
