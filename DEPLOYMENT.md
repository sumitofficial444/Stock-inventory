# Vercel + MongoDB Atlas + Cloudinary

Vedant Enterprises setup is configured locally. The seeded admin login is stored in the ignored `.env` as `SETUP_ADMIN_EMAIL` and `SETUP_ADMIN_PASSWORD`. These two setup variables are only for local provisioning; Vercel runtime does not need them because the account password is already hashed in Atlas. Copy only the runtime Atlas/Cloudinary/JWT settings below into Vercel. Six `DEMO-` stock items and their generic placeholder images are sample data, not the shop's actual stock or supplier prices.

Push the complete repository to GitHub and import it into Vercel. React is built with Vite; api/index.js exports the Express API as one Node function. vercel.json routes /api/* to that function. No separate backend host or API domain is needed.

## Environment settings

Edit the ignored .env file locally. Add the same secrets in Vercel Project Settings > Environment Variables, then redeploy. Local .env is not pushed or automatically copied to Vercel.

```dotenv
MONGO_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER/vedant-enterprises?retryWrites=true&w=majority
JWT_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
NODE_ENV=production
REQUIRE_TRANSACTIONS=true
ALLOW_REGISTRATION=true
```

Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and save it directly in the environment settings. Keep it stable across redeployments. Never use a VITE_ prefix for secrets. PORT=5051 is for local use only; Vercel needs no port setting.

## MongoDB Atlas

Create a cluster and a database user with read/write access limited to the application database. Use the Node driver URI, include the database name, and URL-encode special characters in the database password. The Atlas account password is not the database-user password.

Configure Atlas Network Access for your deployed function's outbound traffic; your laptop IP alone will not work. Prefer restricted/static outbound IPs where available for the selected hosting plan. This code does not open Atlas network access automatically. Use separate development/preview and live databases where possible. Configure and test backups before storing the only copy of business data.

The existing Atlas URI was successfully connected during development. Its value is not printed here. Local database data is not automatically migrated; back up before any deliberate migration.

## Cloudinary

Create a Cloudinary product environment and copy its Cloud name, API key and API secret into the variables above. No unsigned upload preset is needed. The authenticated backend validates the image, signs the upload and returns an HTTPS delivery URL. Never expose API_SECRET in frontend code.

Product photos and business logos use the same upload endpoint. PNG, JPEG and WebP are supported, up to 2 MB per image. Uploads use public delivery URLs: do not use this feature for private documents. Existing base64 images remain compatible and are not automatically migrated/deleted. Cloudinary credentials are not configured yet, so verify a real upload after entering them.

## Vercel settings

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Framework preset | Vite |
| Node.js version | 22.x |
| Install command | npm ci |
| Build command | npm run build |
| Output directory | dist |

Deploy the entire repository, including api/, server/ and vercel.json, not only dist or src. Review plan limits/costs in your own account. No deployment or subscription is created by this setup.

After deployment visit https://YOUR_DOMAIN/api/health and expect app=vedant-enterprises and database=connected. Register the owner, save the business profile, then set ALLOW_REGISTRATION=false and redeploy for a single-shop installation. Local .env should not use NODE_ENV=production unless you intend to enforce the production configuration checks.

## Verify before shop handover

1. Sign in, upload a real product photo and logo, refresh and confirm persistence.
2. Create a discounted test sale and verify remaining stock and invoice after refresh.
3. Verify print/Save PDF layout with real business details and multiple pages.
4. Verify account isolation and backup/restore using isolated preview data.

npm test checks totals, rounding, image validation and mocked signed uploads. node server/smoke.js tests a running backend with a temporary account and removes its own records. It checks fractional sale, persistence, repeat request protection and oversell rejection. Default URL is http://localhost:5051; API_BASE_URL can override it. Use on development/preview with registration enabled, not the live shop database.

## Reliability and remaining limits

Atlas transactions combine stock deductions, financial-year invoice sequence and invoice creation atomically. Repeat requests return the saved invoice instead of deducting again. Production billing requires a replica set; local standalone MongoDB keeps development-only compensating rollback. The backend refuses production startup without all required settings or a database connection.

Deployment is not a claim of complete GST compliance: buyer GSTIN/address, place of supply, CGST/SGST/IGST handling, bill-of-supply rules, credit notes and applicable e-invoicing remain pending. Current invoices show combined GST. Returns, purchasing/GRN, stock movement history, staff roles, password recovery and multi-warehouse support remain pending. Tokens use browser storage and rate limits are per function instance; review stronger session handling and shared rate limiting before wider rollout.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel routing](https://vercel.com/docs/project-configuration/vercel-json), [Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/), [Cloudinary](https://cloudinary.com/documentation/upload_images).
