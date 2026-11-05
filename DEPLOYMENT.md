# Vercel deployment — Vedant Enterprises

Push the complete repository, including api/, server/ and vercel.json. Import the root as Vite, use Node 22.x, install npm ci, build npm run build, output dist. React is static and /api/* routes to the Express Node function.

## Private server environment variables

- MONGO_URI: Atlas connection string including application database.
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET: server-side Cloudinary credentials.
- ADMIN_EMAIL: admin@vedant.local (or your existing owner email).
- SETUP_ADMIN_EMAIL: same owner email.
- SETUP_ADMIN_PASSWORD: the desired owner password, 8–72 bytes.
- NODE_ENV: production.
- REQUIRE_TRANSACTIONS: true.

Never use VITE_ for secrets. .env is ignored and must not be pushed. Add runtime values separately in Vercel Environment Variables. PORT=5051 is local only. JWT_SECRET is no longer used; sessions now use opaque HttpOnly cookies stored as hashes in Atlas.

## Admin access

No public account registration or demo workspace exists. Only the configured existing owner can log in; other database accounts are rejected. Password changes synchronize on backend startup, revoke old sessions, and require a restart/redeploy. Logout revokes the server session. Session cookies use Secure in production, HttpOnly and SameSite=Strict, and expire after 8 hours. ALLOW_REGISTRATION cannot re-enable registration.

Atlas must allow the deployed function's outbound network traffic, not just the laptop IP. Configure restricted/static egress where supported and test backups. Atlas transactions keep invoice and stock updates atomic. Cloudinary uploads are signed server-side; product/logo URLs are public delivery URLs.

## Verify deployment

Visit /api/health: expect app=vedant-enterprises and database=connected. The root must show only the admin login screen while signed out. Log in, confirm the existing stock, upload an image, print a sample invoice, then logout and confirm private pages/API data are inaccessible. Use isolated preview data for sales tests. Local access test: node server/access-smoke.js.

Deployment itself is user-managed and has not been performed here. Combined GST is implemented; complete tax invoice compliance, returns, purchase/GRN, stock history and password recovery remain pending. Rate limits are per function instance; review shared rate limiting before a wider rollout.
