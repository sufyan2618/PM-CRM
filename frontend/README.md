# NovaWorks Frontend

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm. The backend requires Bun, MongoDB, and Redis.

From `frontend`:

```powershell
npm install
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`. Vite proxies `/api/*` to `http://localhost:5000` by default. Copy `.env.example` to `.env` to change `VITE_API_BASE_URL` or `VITE_DEV_PROXY_TARGET`.

Start and seed the backend using the steps in [the backend README](../backend/README.md). The demo cast uses the shared password `Demo123!`.

## Verify the frontend

```powershell
npm run build
npm run lint
```

The UI uses the `/api/v1` API and keeps the refresh session in the backend’s HTTP-only cookie. The transcript conversion screen also needs a valid LLM API key configured on the backend.
