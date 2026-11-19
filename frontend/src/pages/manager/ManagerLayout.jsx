import DashboardLayout from "../../layouts/DashboardLayout.jsx";

const links = [
  { to: "/manager", label: "Overview" },
  { to: "/manager/warehouses", label: "My Warehouses" },
  { to: "/manager/inventory", label: "Inventory" },
  { to: "/manager/add-stock", label: "Add Stock" },
  { to: "/manager/remove-stock", label: "Remove Stock" },
  { to: "/manager/transactions", label: "Transactions" },
  { to: "/manager/orders", label: "Orders" },
  { to: "/manager/supply-requests", label: "Supply Requests" },
  { to: "/manager/low-stock", label: "Low Stock" },
];

export default function ManagerLayout() {
  return <DashboardLayout links={links} title="Manager Dashboard" />;
}
