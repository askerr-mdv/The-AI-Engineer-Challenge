### Front End

A calm Next.js chat for the supportive mental coach. It talks to the FastAPI backend and never sees the OpenAI API key.

## Run it locally

From the `frontend` folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The chat calls `http://localhost:8000/api/chat` unless you set a different backend address. Start the API from the repository root first:

```bash
uv run uvicorn api.index:app --reload
```

## Point it at another backend

Copy the example env file and change the public address. No secrets belong in this file.

```bash
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend.example.com
```

Restart `npm run dev` after changing it. On Vercel, set the same variable before the frontend build.
