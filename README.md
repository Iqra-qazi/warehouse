# Inventory & Warehouse Management System

A role-based MERN inventory application for warehouse stock, sales orders, supplier replenishment requests, and stock movement reporting.

## Technology

- Frontend: React 19, Vite, Tailwind CSS v4, React Router, Axios, react-hot-toast
- Backend: Node.js 20+, Express 5, MongoDB, Mongoose, JWT, bcrypt
- Images: ImageKit (private key stays on the backend)

## Features by role

| Role | Main capabilities |
|---|---|
| Admin | Manage users, products, suppliers, warehouses, orders, stock transactions, supply requests, and low-stock alerts |
| Warehouse manager | Work only in assigned warehouses; view inventory, change stock, process orders, and review supply requests |
| Sales representative | Browse products and stock; create, view, and cancel their own pending orders |
| Supplier | Manage own profile; view own products; submit and track supply requests |

## Folder structure

```text
Backend/
  seed/seed.js          repeatable demo data seed
  services/             ImageKit asset verification and cleanup
  src/
    config/             MongoDB and ImageKit configuration
    controllers/        API handlers
    middlewares/        authentication, role, warehouse access, errors
    models/             Mongoose models
    routes/             Express API routes
    services/           stock and other business services
  tests/                unit/API checks and instructor API script
  server.js
frontend/
  src/
    api/ context/ hooks/
    components/ layouts/
    pages/               admin, manager, supplier, sales, shared
```

## Prerequisites

- Node.js 20 or newer and npm
- MongoDB Atlas or a local MongoDB instance
- An ImageKit account for image upload features

## Local setup

1. Clone the project and open a terminal at its root:

   ```powershell
   git clone <repository-url>
   cd <repository-folder>
   ```
2. Install backend dependencies:

   ```powershell
   cd Backend
   npm install
   Copy-Item .env.example .env
   ```

3. Configure `Backend/.env`:

   | Variable | Purpose |
   |---|---|
   | `PORT` | Backend HTTP port (default `5000`) |
   | `MONGO_URI` | MongoDB connection string |
   | `JWT_SECRET` | Long, random JWT signing secret |
   | `JWT_EXPIRES_IN` | JWT lifetime, for example `1h` or `1d` |
   | `FRONTEND_URL` | Exact frontend origin allowed by CORS, e.g. `http://localhost:5173` |
   | `IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
   | `IMAGEKIT_PRIVATE_KEY` | ImageKit private key; backend only |
   | `IMAGEKIT_URL_ENDPOINT` | ImageKit HTTPS URL endpoint |
   | `USE_MONGO_TRANSACTIONS` | `true` for replica-set transactions; otherwise compensating stock rollback is used |
   | `SEED_PASSWORD` | Optional password override for all demo accounts |

   Do not use the documented demo password on a shared or production system.

4. MongoDB Atlas setup: create a database user with a strong password, create a QA database whose name ends in `_qa` (for example `inventory_management_qa`), and copy its `mongodb+srv://` URI to `MONGO_URI`. URL-encode special characters in the database password. Add the backend host's IP/network to Atlas Network Access; avoid a permanent unrestricted IP rule when possible. The seed and API test scripts refuse to run unless the URI database ends in `_qa` or `_test`.
5. ImageKit setup: create an ImageKit project, copy its public key, private key, and HTTPS URL endpoint into the backend environment. Never put the private key in frontend variables.
6. From `Backend`, seed demo data and start the API:

   ```powershell
   npm run seed
   npm start
   ```

   The seed is safe to rerun. `npm run seed -- --reset` deletes all application documents in the seeded collections before rebuilding the demo data. It is allowed only on a database ending in `_qa` or `_test`. **This reset is destructive.**

7. In a second terminal:

   ```powershell
   cd frontend
   npm install
   Copy-Item .env.example .env
   ```

   Set `VITE_API_URL=http://localhost:5000/api` in `frontend/.env`, then start Vite:

   ```powershell
   npm run dev
   ```

8. Open `http://localhost:5173`. Check backend health at `http://localhost:5000/api/health`.

## Seeded demo logins

All seeded users use `Admin@123` unless `SEED_PASSWORD` is set in `Backend/.env`. With an override, use that configured value for every account. Seed accounts contain dummy data only.

| Role | Email |
|---|---|
| Admin | `admin@example.com` |
| Manager 1 (Main Warehouse) | `manager1@example.com` |
| Manager 2 (Secondary Warehouse) | `manager2@example.com` |
| Supplier 1 | `supplier1@example.com` |
| Supplier 2 | `supplier2@example.com` |
| Sales 1 | `sales1@example.com` |
| Sales 2 | `sales2@example.com` |

The seed creates nine products across Electronics, Accessories, and Furniture; both warehouses receive stock and stock-in transactions. Mouse stock in Main Warehouse is intentionally 4 with a low-stock limit of 10. Sample orders exist in Pending, Processing, Completed, and Cancelled states; supply requests exist in Pending, Approved, and Rejected states.

## Roles and permissions

| Operation | Admin | Warehouse manager | Sales representative | Supplier |
|---|---|---|---|---|
| User administration | All users | Own profile | Own profile | Own profile |
| Product catalog | Create/edit/delete | Create/edit | Read | Read own products |
| Warehouse data | All | Assigned warehouses only | Warehouse options | Warehouse options |
| Stock and transactions | All warehouses | Assigned warehouses only | Read stock | Read stock for own products only |
| Orders | All; process/cancel pending | Assigned warehouses; process/complete | Own orders; create/cancel pending | None |
| Supply requests | All; approve/reject | Assigned warehouses; approve/reject | None | Own requests |
| Dashboard | Admin | Assigned warehouses | Own sales | Own products/requests |

The frontend guards routes for usability; authorization and warehouse ownership are also enforced on the backend. Public registration rejects the `admin` role. Admin accounts must be created by an admin or by the seed.

## API endpoints

All API paths are prefixed with `/api`. Protected requests accept `Authorization: Bearer <token>` or the HttpOnly `token` cookie. “Manager” always means a manager assigned to the requested warehouse. Order and supply-request reads are further scoped to owner/warehouse as listed.

| Method | Path | Allowed roles |
|---|---|---|
| GET | `/health` | Public |
| GET | `/` | Any authenticated role |
| POST | `/auth/register` | Public, non-admin roles only |
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Authenticated roles |
| GET | `/auth/me` | Authenticated roles |
| GET, POST | `/users` | Admin |
| GET | `/users/suppliers` | Admin |
| GET | `/users/suppliers/:id` | Admin |
| PUT | `/users/:id` | Admin or the profile owner (self-service fields only) |
| PUT | `/users/me/image` | Authenticated roles; own profile |
| DELETE | `/users/:id` | Admin |
| GET | `/products`, `/products/categories`, `/products/:id`, `/products/:id/stock` | Admin, manager, sales; supplier for own product and its stock |
| POST, PUT | `/products`, `/products/:id` | Admin, manager |
| DELETE | `/products/:id` | Admin |
| GET | `/warehouses/options` | Authenticated roles (managers see assigned only) |
| GET | `/warehouses` | Admin, manager (managers see assigned only) |
| POST, PUT, DELETE | `/warehouses`, `/warehouses/:id` | Admin |
| GET | `/upload/auth` | Authenticated roles |
| POST | `/upload` | Authenticated roles; JPEG/PNG/WebP, max 2 MB |
| POST | `/stock/in`, `/stock/out` | Admin, manager (assigned warehouse) |
| GET | `/stock` | Admin, manager (assigned warehouses), sales |
| GET | `/stock/low`, `/stock/transactions`, `/transactions` | Admin, manager (assigned warehouses) |
| POST | `/orders` | Admin, sales |
| GET | `/orders` | Admin, manager (assigned warehouses), sales (own orders) |
| GET | `/orders/:id` | Admin, related manager, owning sales representative |
| PUT | `/orders/:id/status` | Admin, manager (assigned warehouse) |
| PUT | `/orders/:id/cancel` | Admin, owning sales representative; Pending orders only |
| POST | `/supply-requests` | Supplier |
| GET | `/supply-requests`, `/supply-requests/:id` | Admin, manager (assigned warehouses), supplier (own requests) |
| PUT | `/supply-requests/:id/status` | Admin, manager (assigned warehouse) |
| GET | `/dashboard/stats` | Admin |
| GET | `/dashboard/manager` | Manager; assigned warehouses only |
| GET | `/dashboard/sales` | Sales representative |
| GET | `/dashboard/supplier` | Supplier |

## Automated checks

Backend unit/API checks:

```powershell
cd Backend
npm test
```

The instructor-flow script uses Node's built-in `fetch`, requires Node 18+, a running backend on port `5001`, and the seeded QA database. In a PowerShell terminal from `Backend`:

```powershell
$env:DOTENV_CONFIG_PATH = ".env.qa"
$env:PORT = "5001"
npm run seed -- --reset
npm start
# In a second terminal:
$env:DOTENV_CONFIG_PATH = ".env.qa"
$env:API_BASE_URL = "http://localhost:5001/api"
npm run test:api
```

Set `SEED_PASSWORD` if the seeded password was overridden. The API test creates uniquely named users, a warehouse, product, orders, and a supply request; it does not delete test records afterward. Keep `.env.qa` private; it is ignored by Git.

Import [`postman_collection.json`](./postman_collection.json) into Postman. The Login request stores the returned token in the collection variables; set the resource IDs after creating the corresponding users, warehouse, product, order, and request.

## Business rules

- Passwords are bcrypt-hashed by the User model and excluded from JSON responses. JWTs have a configured expiry.
- Stock changes require a positive integer and use a conditional update that prevents negative stock. Each successful stock change creates a transaction.
- A stock record is unique per `{ product, warehouse }`.
- Order lines and totals use current database product prices; Pending orders do not deduct stock.
- Only `Pending -> Processing -> Completed` is allowed. Processing claims the order once and deducts stock; failures roll back. Completed orders do not change stock. Only Pending orders can be cancelled.
- Supply requests belong to one supplier/product/warehouse. Only Pending requests may be approved/rejected; approval adds stock once.
- Low stock is `Stock.quantity <= Product.lowStockLimit`; the dashboard counts the same product/warehouse stock rows as the low-stock list.
- ImageKit file IDs are verified by the backend on save/replace/delete. The private key is never sent to the browser.

## Instructor scenario

1. Login as admin and show Users, Warehouses, Products, Suppliers, Orders, Supply Requests, Stock Transactions, and Low Stock.
2. Login as a manager assigned to Main Warehouse. Add 20 Laptop units, then remove 3; verify stock is 17 and there are two stock transactions.
3. Login as a sales representative and create an order for two Laptops. Verify total `Rs. 160,000`, status Pending, and stock remains 17.
4. As admin or the assigned manager, process the order. Stock becomes 15 and the `Order ORD-...` stock-out transaction is present.
5. Try Process again: it returns 400 and stock remains 15. Mark it Completed: stock remains 15.
6. Try an order larger than available stock; it is rejected. Process a two-product order where the second item has insufficient stock; the first item's deduction is rolled back and the order stays Pending.
7. As manager 2, try Main Warehouse: access is denied. As supplier, show own products and supply requests; as a different sales representative, show that another user's order is inaccessible.

## Deployment checklist

### Backend on Render

1. Create a Web Service from the repository and set the Root Directory to `Backend`.
2. Build command: `npm install`. Start command: `npm start` (`node server.js`).
3. Configure `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, ImageKit variables, and `USE_MONGO_TRANSACTIONS=true`. Use Render's assigned `PORT` if supplied.
4. In Atlas, allow the backend service's outbound IP addresses (or the provider's documented egress range) and verify the database user has only required database access.

### Backend on Railway

1. Create a Railway service from the repository; set the service Root Directory to `Backend` if needed.
2. Use `npm install` for install and `npm start` as the start command.
3. Set the same backend environment variables. Set `FRONTEND_URL` to the deployed frontend's exact HTTPS origin.
4. Allow Railway's outbound network path in Atlas and test `/api/health`.

### Backend on Vercel

1. Import the repository and set Root Directory to `Backend`.
2. Set `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL=https://warehouse-three-phi.vercel.app`, and any ImageKit variables used by the app. Set `USE_MONGO_TRANSACTIONS=true` for a replica-set database. Set `FRONTEND_URL` on the backend project for the deployment environment in use (Production, or Preview when testing a preview deployment); use the exact origin with no path or quotes.
3. Assign the backend project a stable production domain in **Settings → Domains**. Use that domain in the frontend configuration, not a deployment-specific URL.
4. If `OPTIONS` returns `200` with `Allow: POST` but no CORS headers, the Express CORS origin callback did not match the request's `Origin`. Check that the backend deployment received the correct `FRONTEND_URL`. A redirect to `https://vercel.com/sso-api` instead indicates Vercel Authentication/Deployment Protection; disable **Vercel Authentication** under **Settings → Deployment Protection** for the public API deployment.
5. Redeploy the backend after changing settings or environment variables. Test `https://<backend-production-domain>/api/health` and the CORS preflight command below.

### Frontend on Vercel

1. Import the repository and set Root Directory to `frontend`.
2. Framework: Vite; build command: `npm run build`; output directory: `dist`.
3. Set `VITE_API_URL=https://<backend-production-domain>/api` in the Vercel environment and redeploy; Vite variables are embedded at build time.
4. `frontend/vercel.json` rewrites client routes to `index.html`, so refreshing a route such as `/admin/users` works.

### Frontend on Netlify

1. Import the repository and set Base directory to `frontend`, build command to `npm run build`, and publish directory to `dist`.
2. Set `VITE_API_URL=https://<backend-production-domain>/api`, then redeploy.
3. Add a Netlify SPA redirect (`/* /index.html 200`) if using Netlify instead of the included Vercel rewrite.

For Atlas deployments, `USE_MONGO_TRANSACTIONS=true` is recommended because Atlas is a replica set. `FRONTEND_URL` must be the frontend origin, not the backend URL.

To verify CORS after deploying, run:

```sh
curl -i -X OPTIONS "https://<backend-production-domain>/api/auth/login" \
  -H "Origin: https://warehouse-three-phi.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

The response should be `204`, include
`Access-Control-Allow-Origin: https://warehouse-three-phi.vercel.app`,
and must not redirect. Credentialed cookies are not enabled; the frontend uses bearer tokens.

## Known limitations

- Image upload and replacement require a configured ImageKit project.
- The standalone MongoDB fallback uses atomic conditional writes and compensating rollback; a replica set with transactions is stronger for multi-document changes.
- The API test creates records and intentionally leaves them in the database; use a disposable database for repeated QA.
- No production deployment or real ImageKit credentials are included in this repository.
- A Git repository/history is not present in the supplied workspace, so historical secret-removal status cannot be verified from this checkout.
