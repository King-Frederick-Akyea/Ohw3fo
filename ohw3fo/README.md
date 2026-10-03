# Ɔhwɛfo app

The Next.js app for Ɔhwɛfo. See the [main README](../README.md) for what it is, what we found, and how it works.

```bash
cp .env.example .env    # add the Guard token and OpenAI key
npm install
npm run dev             # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app at http://localhost:3000 |
| `npm run build` then `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run test:scenarios` | With the app running: plays all 13 demos through both sides and saves `../evidence/scenario_results.json` (Node 22.6+) |
