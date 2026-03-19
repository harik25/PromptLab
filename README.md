<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PromptLab

PromptLab is a React + Express app for analyzing prompts with Gemini, generating optimization reports, and capturing frontend/backend logs to local JSONL files.

## Run locally

Prerequisites:
- Node.js 20+

Steps:
1. Install dependencies:
   `npm install`
2. Set your Gemini key in `.env.local` or `.env`:
   `GEMINI_API_KEY=your_key_here`
3. Start the Vite dev app:
   `npm run dev`

The local app runs on `http://localhost:3000` by default.

## Production / Railway

This project is Railway-ready with an Express production server that:
- serves the built frontend from `dist/`
- exposes `/api/analyze`, `/api/log`, and `/api/health`
- writes logs to `logs/backend.jsonl` and `logs/frontend.jsonl`

### Railway settings

Build command:
`npm install && npm run build`

Start command:
`npm run start`

Required environment variables:
- `GEMINI_API_KEY`
- `NODE_ENV=production`
- `PORT` is provided by Railway automatically

### Files added for deploy

- `railway.json`
- `.env.example`

### Deploy flow

1. Push this repo to GitHub.
2. Create a new Railway project from the repo.
3. Add the `GEMINI_API_KEY` environment variable in Railway.
4. Deploy.

## API model config

`src/models/models.json` now stores environment variable names instead of raw keys. Do not place real API keys in that file.

## Logs

Logs are written to:
- `logs/backend.jsonl`
- `logs/frontend.jsonl`

In local development, Vite ignores `logs/` so log writes do not trigger page reloads.

## Final local commands

If you want to publish this repo now:

```bash
git init
git add .
git commit -m "Prepare PromptLab for Railway deployment"
```

Then create a GitHub repo and connect it:

```bash
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
