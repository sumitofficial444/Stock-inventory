# Vedant Enterprises

Shop setup: `npm run setup:shop` connects the configured Atlas/Cloudinary accounts and adds six clearly marked sample paint/accessory products with placeholder bucket images. It creates `admin@vedant.local` if needed and saves its random login password as `SETUP_ADMIN_PASSWORD` in the ignored `.env` file. Existing passwords, profiles and product quantities are never reset by rerunning setup. Sample prices/tax rates are illustrative; replace them with the shop's actual values and fill the real business address, phone and GSTIN before billing.

For live hosting and required Atlas/Cloudinary settings, see [DEPLOYMENT.md](DEPLOYMENT.md). New signed-in image uploads now use Cloudinary; demo uploads stay temporary. Atlas billing uses transactions and repeat-request protection. The local API defaults to port 5051; Vite reads the configured `PORT`.

A responsive MERN inventory and billing app for a local business. The dashboard opens in an explicitly labelled sample workspace so you can explore it before creating an account. Demo data is temporary; signed-in business data is stored in MongoDB.

## Run locally

1. Install Node.js 20.19+ (or 22.12+) and run your local MongoDB server.
2. Run `npm install` in this folder.
3. Copy `.env.example` to `.env` and set a long random `JWT_SECRET`.
4. Run `npm run dev` and open http://localhost:5173.
5. Select **Set up your business**, create an admin account, and fill out **Business profile**.
6. Add your products and their images, categories, SKU, HSN, variants, measurement units, prices, GST and initial quantities.
7. Use **Create bill** to select products and quantities. Add a customer, discount and payment method. Creating the bill deducts stock; viewing or printing a bill does not deduct it again.

MongoDB Compass connects to `mongodb://127.0.0.1:27017`, database `vedant-enterprises`. Compass is a database viewer; the MongoDB server must also be running.

`npm run build` builds the frontend. `npm start` serves the API and built frontend at http://localhost:5051 (or your configured `PORT`). `npm test` verifies invoice calculations, rounding, image validation and signed upload requests.

## Included

- Separate admin accounts with hashed passwords, expiring JWT authentication and account-scoped business data.
- Inventory images (maximum 2 MB each), categories, SKU, HSN, size/pack variants and fractional measurements.
- Stock availability, low stock alerts, restocking and product editing/deletion.
- Percentage discount before GST, customer details, payment method, invoice history and browser print/Save as PDF.
- Logo, business contact details, GSTIN and custom invoice footer. Existing bills retain their business/product details.
- On Atlas, database transactions combine stock changes and invoice creation. Repeat invoice requests return the original bill. Standalone MongoDB uses a development-only compensating rollback.
- Responsive desktop/mobile layout. New signed-in images upload to Cloudinary; existing MongoDB data URLs remain supported.

## Current scope

GST is shown as one combined tax amount; CGST/SGST/IGST place-of-supply rules, e-invoicing, returns, purchase orders, suppliers, multi-location stock, staff permissions and audit trails are not implemented. Confirm invoice requirements with your accountant before official tax billing. Credit is a payment label, not a receivables ledger. A process crash with standalone local MongoDB can require reconciliation; production requires Atlas/replica-set transactions. Demo mode and local HTTP are intended for local use. Set a persistent JWT secret before keeping sessions across server restarts. The working product name has not been checked for trademark or domain availability.
