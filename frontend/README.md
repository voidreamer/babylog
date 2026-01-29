# HeyBub Frontend

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
VITE_COGNITO_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_REDIRECT_URI=https://your-cloudfront-url.cloudfront.net/callback
```

## Build for Production

```bash
npm run build
```

Output will be in the `dist` folder.
