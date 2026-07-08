# Myelin

Myelin is a daily productivity workspace built with Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Zustand, Zod, Mongoose, and Recharts.

## Requirements

- Node.js 18 or newer
- npm
- MongoDB Atlas or another MongoDB instance

## Install

```bash
git clone https://github.com/lokendra-cmd/Myelin.git
cd Myelin
cp .env.example .env.local
npm install
```

Set `MONGODB_URI` inside `.env.local` before starting the app.

## Run

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Build

```bash
npm run build
npm start
```

## What It Does

- Daily workspace for tasks and categories
- Multi-select highlights for important tasks
- Deadline picker with calendar and time selection
- Rules panel with add and delete support
- Weekly review and monthly analytics
- Markdown and PDF export

## Deploy

Deploy on Vercel or any Node.js host. Add these environment variables:

- `MONGODB_URI`
- `MONGODB_DB` optional, defaults to `sprint`

## Notes

- The app uses a PWA manifest and service worker.
- Theme switching is handled in-app with explicit light and dark modes.
