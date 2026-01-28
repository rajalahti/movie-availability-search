# Movie Availability Search

https://movies.rajalahti.me

Search for movies across multiple streaming services and countries at once. Perfect for finding where a title is available when using a VPN service.

## Features

- 🔍 Search movies across 44 countries simultaneously
- 📺 Filter by streaming providers (Netflix, Disney+, HBO Max, etc.)
- 🤖 AI-powered similar movie recommendations (GPT-4o)
- 🌍 See which country has your movie available
- 🎬 Movie details: poster, description, genres, runtime

## Project Structure

```
├── api/           # AWS Lambda backend (Serverless)
│   ├── handler.js
│   ├── searchMovie.js
│   ├── getSimilarMovies.js
│   └── serverless.yml
│
└── frontend/      # React + Vite + TypeScript + Tailwind
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   └── types/
    └── package.json
```

## Backend (API)

AWS Lambda functions deployed with Serverless Framework.

### Endpoints

- `GET /search?title=<title>&providers=<providers>` - Search movie availability
- `GET /similar?title=<title>` - Get AI recommendations

### Deploy

```bash
cd api
npm install
serverless deploy
```

## Frontend

Modern React app with Vite, TypeScript, and Tailwind CSS.

### Development

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Environment

Create `frontend/.env`:
```
VITE_API_URL=https://your-api-gateway-url
VITE_API_KEY=your-api-key
```

## Tech Stack

**Backend:**
- Node.js 20.x
- AWS Lambda
- Serverless Framework
- JustWatch GraphQL API
- OpenAI GPT-4o

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)
