---
name: do-work
description: Execute a unit of work end-to-end — plan, implement, validate, and commit. Use when the user describes a feature, bug fix, or task they want completed in full, or says "do work", "implement this", or "build this".
---

# Do Work

Execute a complete unit of work: plan, implement, validate, commit.

## Step 2: Understand the task

Read any referenced plan or PRD. Explore the codebase to understand the relevant files,
patterns, and conventions. If the task is ambiguous, ask the user to clarify the scope
before proceeding.

## Step 2: Plan (optional)

If the task has not already been planned, create a plan for it.

## Step 3: Implement

Work through the plan step-by-step, marking tasks complete as you go.

### Backend code (services, db, lib, server-side logic)

Use red/green refactor, one test at a time in tracer-bullet style:

1. **Red** — Write a single failing test for the next piece of behavior.
2. **Green** — Write the minimal code to make that test pass.
3. **Repeat** — Repeat from step 1 for the next slice of behavior until the feature is complete.
4. **Refactor** — Clean up while keeping the tests green.

Do this for any `*-service.ts` files and other backend modules. Each cycle should
cover one small, focused behavior — not the whole feature at once.

### Frontend code (components, routes, UI)

Implement directly without red/green refactor. Write the code, then validate in
Step 4.

## Step 4: Validate

Run both feedback loops and fix any issues. Repeat until both pass:

```sh
pnpm typecheck
```

```sh
pnpm run test
```

If either command fails, read the errors, fix the code, and re-run. Do not move on until both commands pass cleanly.

## Step 5: Commit

Once validation passes, commit the work.
