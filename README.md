# Vyapventory

A responsive MERN inventory and billing app for a local business. The dashboard opens in an explicitly labelled sample workspace so you can explore it before creating an account. Demo data is temporary; signed-in business data is stored in MongoDB.

## Run locally

1. Install Node.js 20.19+ (or 22.12+) and run your local MongoDB server.
2. Run `npm install` in this folder.
3. Copy `.env.example` to `.env` and set a long random `JWT_SECRET`.
4. Run `npm run dev` and open http://localhost:5173.
5. Select **Set up your business**, create an admin account, and fill out **Business profile**.
6. Add your products and their images, categories, SKU, HSN, variants, measurement units, prices, GST and initial quantities.
7. Use **Create bill** to select products and quantities. Add a customer, discount and payment method. Creating the bill deducts stock; viewing or printing a bill does not deduct it again.

MongoDB Compass connects to `mongodb://127.0.0.1:27017`, database `vyapventory`. Compass is a database viewer; the MongoDB server must also be running.

`npm run build` builds the frontend. `npm start` serves the API and built frontend at http://localhost:5000. `npm test` verifies invoice calculations and invalid inputs.

## Included

- Separate admin accounts with hashed passwords, expiring JWT authentication and account-scoped business data.
- Inventory images (maximum 2 MB each), categories, SKU, HSN, size/pack variants and fractional measurements.
- Stock availability, low stock alerts, restocking and product editing/deletion.
- Percentage discount before GST, customer details, payment method, invoice history and browser print/Save as PDF.
- Logo, business contact details, GSTIN and custom invoice footer. Existing bills retain their business/product details.
- Conditional database stock updates prevent simultaneous sales from taking stock below zero; failed invoice creation restores reserved quantities.
- Responsive desktop/mobile layout. Images are stored in MongoDB as data URLs for a simple local installation.

## Current scope

This is a working local first version. GST is shown as one combined tax amount; CGST/SGST/IGST place-of-supply rules, e-invoicing, returns, purchase orders, suppliers, multi-location stock, staff permissions and audit trails are not implemented. Confirm invoice requirements with your accountant before official tax billing. Credit is a payment label, not a receivables ledger. Stock reservation uses compensating rollback for compatibility with a standalone local MongoDB; a process crash between stock update and invoice creation requires reconciliation. Use MongoDB replica-set transactions before production deployment. Demo mode and local HTTP are intended for local use. Set a persistent JWT secret before keeping sessions across server restarts. The working product name has not been checked for trademark or domain availability.
