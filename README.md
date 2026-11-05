# Vedant Enterprises

Private inventory and billing software for one shop owner. Public registration and demo access are disabled in both the UI and API.

## Run

Use Node 22, run npm ci, fill the ignored .env, then npm run dev. Frontend: http://localhost:5173. npm run build followed by npm start serves the built app at http://localhost:5051.

Sign in using SETUP_ADMIN_EMAIL (or ADMIN_EMAIL) and SETUP_ADMIN_PASSWORD. The configured existing admin is the only allowed account. Changing SETUP_ADMIN_PASSWORD and restarting synchronizes its hash in Atlas and revokes existing sessions. On Vercel update the environment setting and redeploy.

The dashboard renders only after session validation. HttpOnly session cookies expire after 8 hours. Logout deletes the server session and clears the workspace. Old browser-stored JWTs are no longer accepted.

## Data and checks

Atlas stores the shop's data; Cloudinary stores product images and logos. Six DEMO- stock items are illustrative. npm run setup:shop adds missing samples without resetting stock. Fill real address, phone, GSTIN and product values before use.

npm test runs calculation/media tests. node server/access-smoke.js verifies private API access, blocked registration, admin login and session revocation without changing stock.

See DEPLOYMENT.md for Vercel configuration. GST place-of-supply and CGST/SGST/IGST handling, returns, purchasing and a stock movement ledger remain pending.
