/**
 * Root component: renders the route table. Providers (router, theme, auth, toasts) are set up in
 * main.jsx.
 *
 * Root component. Providers and the router wrapper live in main.jsx;
 * all route definitions live in routes/AppRoutes.jsx.
 *
 * Used by: main.jsx
 */

import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return <AppRoutes />;
}
