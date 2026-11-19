import DashboardLayout from "../../layouts/DashboardLayout.jsx";

const links = [
  { to: "/supplier", label: "Overview" },
  { to: "/supplier/profile", label: "Profile" },
  { to: "/supplier/products", label: "My Products" },
  { to: "/supplier/submit-request", label: "Submit Request" },
  { to: "/supplier/requests", label: "Request History" },
];

export default function SupplierLayout() {
  return <DashboardLayout links={links} title="Supplier Portal" />;
}
