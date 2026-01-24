# SimpleBaby Frontend

React frontend for the baby tracker app.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

For production, create a `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_REDIRECT_URI=https://your-cloudfront-url.cloudfront.net/callback
```

## Build for Production

```bash
npm run build
```

Output will be in the `dist` folder.
