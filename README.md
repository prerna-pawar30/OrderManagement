# Digident · Manual Order Console

A staff-facing React app for the manual order backend you shared: login, sidebar + header
with a profile menu, manual order creation (auto-fires invoice creation on success), an
order list, and a client/order detail panel with **Return / Partial return / Cancel**.

## Run it

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to your backend, e.g. http://localhost:3000
npm run dev
```

Open http://localhost:5175.

## What's wired up

- **Auth** (`src/context/AuthContext.jsx`, `src/api/client.js`) — calls `AuthService.login`,
  stores the returned employee in `sessionStorage` for the header/profile, and relies on the
  backend's httpOnly cookies for the actual session (`withCredentials: true`). A 401 triggers
  one silent `refresh-token` call before forcing logout.
- **Sidebar + header** (`src/layout`) — nav for Orders / New order / Invoices, profile menu
  with sign-out.
- **Create order** (`src/pages/CreateOrderPage.jsx`) — matches `createManualOrderService`'s
  shape exactly (items, shipping/billing address, payment, GST, discount). On success it
  immediately calls `InvoiceService.create` with the created order's data.
- **Order list** (`src/pages/OrdersListPage.jsx`) — paginated table from
  `getAllManualOrdersService`, searchable by name/phone/order id/org.
- **Client + order detail** (`src/components/OrderDetailDrawer.jsx`) — opens on row click,
  fetches the single order, shows client + billing/shipping info, line items, payment/courier
  info, and every *other* order from the same phone number as purchase history. The three
  action buttons open `CancelOrderModal` / `ReturnOrderModal` (full or partial), wired to
  `cancelManualOrderService` and `createManualReturnService`.
- **Invoices page** — since the backend snippet only exposed `invoice/create` (no list/get),
  this reuses the order list as a stand-in invoice ledger with a "Regenerate" action per row.

## Auth model (updated)

Your backend returns `AUTH_HEADER_MISSING` on any request without an `Authorization: Bearer
<token>` header — it's not purely cookie-based. `src/api/tokenStorage.js` now captures the
token from the login response and `src/api/client.js` attaches it to every request; the same
happens after a refresh. **Check `extractToken()` in `tokenStorage.js`** — it tries `token`,
`accessToken`, `access_token`, `jwt`, `authToken` in that order, and logs a console warning on
login if none of those match. Open your `/employee/login` response once in devtools and update
that list to the real field name if the warning shows up.

## Things you'll likely need to adjust

The backend pieces you pasted don't fully agree with each other, so I made explicit choices —
check these against your actual server before shipping:

1. **`checkPermission` slugs** — your Postman examples send `"permission":"Order-create"` in
   the body for writes and `.../order-get` in the URL for reads, but I don't have the
   middleware itself. I centralized the slugs in `src/api/ApiRoutes.js` → `PERMISSIONS`, so
   you can rename them in one place once you check what `checkPermission` actually expects.
2. **`GET_ALL` / `GET_ONE`** — your `manualOrder.routes.js` requires a `:permission` URL
   segment (`/get/all/:permission`), but the `API_ROUTES` snippet you sent didn't include it.
   I updated those two into functions that take `(page, limit, permission)` /
   `(orderId, permission)` — update the call sites if your real route differs.
3. **Status update / courier update routes** — present in your Express router
   (`PATCH /status/:orderId`, `PUT /courier/:orderId`) but missing from the `API_ROUTES` you
   pasted, so I added `STATUS_UPDATE` / `COURIER_UPDATE`. `updateStatus` isn't wired into the
   UI yet since you didn't ask for a status-stepper — the service method is ready if you want
   me to add packed/shipped/delivered controls next.
4. **Invoice payload** — `invoice.route.js` wasn't included, so `InvoiceService.create` sends
   a reasonable guess (`orderId`, customer info, items, total, billing address). Swap the body
   in `CreateOrderPage.jsx` / `InvoicesPage.jsx` for whatever `invoice.controller.js` actually
   expects.
5. **Login response shape** — `AuthContext.login` reads `res.data.employee` first, then falls
   back to `res.data.user`/`res.data`. Point it at the real field once you can see a sample
   `employee/login` response.
6. **No logout endpoint** was in the code you shared, so "Sign out" just clears local state.
   Add a real call in `AuthService.logout` if the backend has one (e.g. to clear the cookie).

## Design

Sidebar in deep ink navy, teal as the primary action color, amber for pending/partial states,
coral for cancellations/refunds, mint for delivered/paid — Manrope for headings, Inter for
body/data, JetBrains Mono for order IDs. All tokens live in `tailwind.config.js`.
