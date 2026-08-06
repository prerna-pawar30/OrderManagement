import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const TITLES = {
  "/orders": "Orders",
  "/orders/new": "New manual order",
  "/invoices": "Invoices",
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title =
    TITLES[window.location.pathname] ||
    (window.location.pathname.startsWith("/orders") ? "Orders" : "Digident");

  return (
    <div className="flex min-h-screen bg-mist-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
