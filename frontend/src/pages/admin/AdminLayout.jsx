import DashboardLayout from "../../layouts/DashboardLayout.jsx";

const links = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/profile", label: "Profile" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/warehouses", label: "Warehouses" },
  { to: "/admin/suppliers", label: "Suppliers" },
  { to: "/admin/transactions", label: "Stock Transactions" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/supply-requests", label: "Supply Requests" },
  { to: "/admin/low-stock", label: "Low Stock" },
];

export default function AdminLayout() {
  return <DashboardLayout links={links} title="Admin Dashboard" />;
}
