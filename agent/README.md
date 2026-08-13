# Scheduled agent

Runs workflows on a schedule and reports back to a dashboard you can open on
any device.

## How it fits together

```
agentti.html            you create a job: "Käännöstarkistus, 08:30, arkisin"
   │                    (Vercel, reuses the dashboard's Supabase auth)
   ▼
agent_jobs              the schedule lives here, not in a committed cron file,
   │                    so editing it needs no deploy
   ▼
pg_cron, every minute   enqueue_due_agent_runs() checks which jobs are due
   │
   ▼
dispatch-agent-job      creates the agent_runs row, then asks GitHub to start
   │                    the runner workflow
   ▼
agent-runner.yml        checks out the repo, runs agent/run.mjs
   │
   ▼
agent/run.mjs           reads agent/workflows/<slug>.md, hands it to Claude
   │                    Code headless, commits any changes to a branch
   ▼
agent_runs + push       status and output land back in the dashboard; a push
                        notification hits your phone
```

Two deliberate choices worth knowing:

**The agent never pushes to `main`.** Anything it changes goes to a branch
named `agent/<workflow>-<timestamp>` and waits for a human. A scheduled agent
with write access to the deploy branch is one bad run away from shipping itself
to production.

**The schedule is a time plus weekdays, not a cron expression.** It covers what
this is for, it renders in a UI, and it cannot be typo'd into something that
fires every minute.

## Setup

Four things, all one-time.

### 1. Database

Run `supabase-patch-agent.sql` in the Supabase SQL editor.

Then set the two values the scheduler needs to reach the edge function. These
have to be database settings rather than function secrets, because `pg_cron`
runs outside any function's environment:

```sql
ALTER DATABASE postgres SET app.supabase_url     = 'https://zubhxdlssoochwbwyxlp.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<service role key>';
```

Reconnect after running these — existing sessions keep the old settings.

### 2. GitHub secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic key — this is what the agent's work bills against |
| `SUPABASE_URL` | `https://zubhxdlssoochwbwyxlp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |

### 3. Edge function secrets

```bash
supabase secrets set \
  GITHUB_TOKEN=<fine-grained PAT> \
  GITHUB_REPO=verkkosivutnoah-bot/selora-website \
  GITHUB_REF=main
```

The PAT needs **Actions: read and write** on this repository and nothing else.
That is the only permission `workflow_dispatch` requires.

### 4. Deploy

`dispatch-agent-job` is in the deploy workflow, so pushing to `main` ships it.
To do it by hand:

```bash
supabase functions deploy dispatch-agent-job --project-ref zubhxdlssoochwbwyxlp --use-api --no-verify-jwt
```

`agentti.html` is static, so Vercel picks it up on the same push.

## Checking it works

1. Open `/agentti.html`, create a job with no time set (manual only).
2. Press **Aja nyt**. The dot should go amber, then blue, then green. The page
   follows the table over Supabase realtime, so it updates without a refresh.
3. If it stays amber, the dispatch failed — check the run's error text, then
   the `dispatch-agent-job` logs in the Supabase dashboard.
4. Once manual runs work, add a time and weekdays. To test the scheduler
   without waiting, set the time to two minutes out and watch.

## Adding a workflow

1. Write `agent/workflows/<slug>.md`. It is the prompt — say what to do, what
   not to touch, and what to report.
2. Add the slug to the `WORKFLOWS` array in `agentti.html` so it appears in the
   dropdown.

The runner validates the slug against what is actually on disk, so a dropdown
entry with no matching file fails the run cleanly rather than doing something
unexpected.

Two things make a workflow behave. Give it an explicit stop condition — the
shipped ones both start by running a script and stop early if it reports
nothing to do. And give it boundaries: name the files it may change, and tell
it to report rather than act when a fix falls outside them.

## Cost

GitHub Actions minutes are free on public repositories and metered on private
ones. The real cost is the Anthropic API usage of each run, which scales with
how much the workflow reads. Both shipped workflows exit early when there is
nothing to do, so a daily job on an unchanged site is close to free.
