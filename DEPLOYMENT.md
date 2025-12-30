# Deploying AstroTalk backend to Render

Follow these steps to deploy the backend service to Render and share a test URL with your circle.

1. Prepare the repo

- Confirm backend runs locally with `cd backend && npm install && npm start`.
- Ensure secrets are NOT committed to the repo (do not add `.env` to repo).

2. Render setup (recommended)

- In Render dashboard, click "New" → "Web Service".
- Connect your GitHub repository (or use the `render.yaml` at repository root to define the service).
- If using the dashboard form set:
  - Environment: `Node` (or use `render.yaml`)
  - Build Command: `cd backend && npm install`
  - Start Command: `cd backend && npm start`
  - Root Directory / Service Path: `backend` (if prompted)

3. Required environment variables (add these in Render Dashboard → Environment)

- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `RAZORPAY_KEY_ID` — Razorpay key id (if used)
- `RAZORPAY_KEY_SECRET` — Razorpay secret (if used)
- `NODE_ENV` — `production`
- Any other keys used by `backend/config` or controllers

4. File uploads

- The app serves `/uploads` from the repository filesystem. Render ephemeral disks are not persisted across deploys — for production use configure S3 or another persistent store and update upload handling.

5. Socket.IO notes

- The server now listens on `process.env.PORT || 5000` so Render's assigned port will be used.
- CORS is currently configured to allow all origins; you can restrict this by setting `FRONTEND_URL` and updating `app.use(cors({ origin: process.env.FRONTEND_URL }))`.

6. Triggering deploy

- After connecting repo and setting env vars, trigger a deploy. The Render dashboard will show the public URL once deployed.

7. Testing

- Use the public URL (e.g., `https://astrotalk-backend.onrender.com`) and hit `GET /` to confirm response.
- Test key endpoints from your mobile/web client by pointing API base URL to the Render URL.

8. Share with your circle

- Provide the public URL and (if needed) a short test flow or Postman collection.

If you want, I can add a minimal Postman collection and example environment file (without secrets) to help your testers.
