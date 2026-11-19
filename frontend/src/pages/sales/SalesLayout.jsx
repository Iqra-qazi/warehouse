import DashboardLayout from "../../layouts/DashboardLayout.jsx";

const links = [
  { to: "/sales", label: "Overview" },
  { to: "/sales/products", label: "Products" },
  { to: "/sales/create-order", label: "Create Order" },
  { to: "/sales/orders", label: "My Orders" },
];

export default function SalesLayout() {
  return <DashboardLayout links={links} title="Sales Dashboard" />;
}
