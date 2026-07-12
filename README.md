# Movie Availability Scan

Consolidated monorepo for the movie availability app.

## Apps

- `apps/web`: React/Vite frontend based on the `movie-search-v2` UI
- `apps/api`: Node API for movie search and similar-movie recommendations

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment files if needed:

   ```bash
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   ```

3. Start both apps in development:

   ```bash
   npm run dev
   ```

Frontend runs on `http://localhost:5173` and the local API runs on `http://localhost:3001`.

### Optional API tuning

`apps/api/.env` supports:

- `SEARCH_CACHE_TTL_MS`: in-memory cache TTL for search results
- `SEARCH_BATCH_SIZE`: how many countries to query in one GraphQL request
- `SEARCH_BATCH_CONCURRENCY`: how many batch requests to run in parallel
- `SEARCH_FALLBACK_CONCURRENCY`: single-country concurrency if batching fails
- `JUSTWATCH_TIMEOUT_MS`: timeout for an individual JustWatch request
- `JUSTWATCH_MAX_RETRIES`: retries for transient JustWatch failures
- `OPENROUTER_API_KEY`: OpenRouter API key for similar-movie recommendations
- `OPENROUTER_MODEL`: recommendation model (defaults to Gemini 2.5 Flash Lite)
- `OPENROUTER_MAX_TOKENS`: output token cap for similar-movie recommendations
- `OPENROUTER_TIMEOUT_MS`: timeout for the OpenRouter request
- `OMDB_API_KEY`: OMDb API key used only for on-demand full descriptions
- `OMDB_TIMEOUT_MS`: timeout for an OMDb request
- `DESCRIPTION_CACHE_TTL_MS`: cache lifetime for verified full descriptions

The frontend requests `GET /description?title={title}&year={year}` only after
the user opens a full description. The backend accepts an OMDb result only when
its normalized title, release year, and `movie` type exactly match the selected
JustWatch movie. The short JustWatch summary remains the fallback when no exact
full plot is available.

## Scripts

- `npm run dev`: run API and frontend together
- `npm run dev:api`: run only the API
- `npm run dev:web`: run only the frontend
- `npm run build`: build the frontend
- `npm run test:api`: run API tests
- `npm run package:api`: build separate Lambda deployment artifacts
- `npm run deploy:api`: deploy the API with Serverless Framework

The Lambda functions are bundled separately. The search package contains only
the JustWatch search implementation, while the recommendation package contains
the OpenRouter implementation. `.env` files are explicitly excluded from both
artifacts. Packaging and deployment require `OPENROUTER_API_KEY` to be available in
the shell or in `apps/api/.env`.

## Production Migration

To keep existing users and saved watchlist items, do not replace these AWS resources:

- Cognito User Pool: `eu-north-1_Y5nn7dGTZ`
- Cognito App Client: `3cksc23hm5hpbdmuhbkjc003ap`
- Cognito Identity Pool: `eu-north-1:53e62a5b-81d8-4542-b6d4-f5dd401e23a1`
- DynamoDB table: `MovieWatchlist`

Safest rollout:

1. Deploy the backend update to the same AWS API stack/stage if possible.
   That lets the existing API base URL and API Gateway key keep working.
2. Set backend Lambda environment variables from `apps/api/.env.production.example`.
3. Build the frontend with `apps/web/.env.production.example`.
4. Keep the Cognito IDs and DynamoDB table name exactly the same.
5. If the frontend URL changes, add the new callback/logout URL to the existing Cognito app client before switching traffic.

Important notes:

- `OPENROUTER_API_KEY` belongs only in the backend/Lambda environment.
- `VITE_API_KEY` is a frontend-exposed API Gateway key, so treat it as a quota gate, not a secret.
- If you create a brand new identity pool or DynamoDB table, existing watchlists will no longer line up automatically.
