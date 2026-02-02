# How to Verify Evaluations

I have set up the evaluation system with Supabase syncing.

## 1. Restart your Server
Since the database schema changed, you **must restart** your Next.js server.
1. Stop the current server (Ctrl+C).
2. Run `npm run dev`.

## 2. Run the Test Script
I created an end-to-end test script that simulates a user clicking "Evaluate".
Run this command in your terminal:

```bash
npx tsx --env-file=.env.local scripts/e2e-test-eval.ts
```

## 3. Check Results
- **Local:** The script will report "SUCCESS".
- **UI:** You should see score badges in the "Telemetry" drawer.
- **Supabase:** Check the `evaluation_results` table in your Supabase dashboard.
