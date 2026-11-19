import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getDashboardPath, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Loader from "./components/Loader.jsx";
import Login from "./pages/public/Login.jsx";
import Register from "./pages/public/Register.jsx";
import Unauthorized from "./pages/public/Unauthorized.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminProfile from "./pages/admin/AdminProfile.jsx";
import Users from "./pages/admin/Users.jsx";
import Products from "./pages/admin/Products.jsx";
import Warehouses from "./pages/admin/Warehouses.jsx";
import Suppliers from "./pages/admin/Suppliers.jsx";
import SupplierDetails from "./pages/admin/SupplierDetails.jsx";
import Transactions from "./pages/admin/Transactions.jsx";
import Orders from "./pages/admin/Orders.jsx";
import AdminOrderDetails from "./pages/admin/OrderDetails.jsx";
import LowStock from "./pages/admin/LowStock.jsx";
import AdminSupplyRequests from "./pages/admin/SupplyRequests.jsx";
import ManagerLayout from "./pages/manager/ManagerLayout.jsx";
import ManagerOverview from "./pages/manager/ManagerOverview.jsx";
import ManagerOrders from "./pages/manager/Orders.jsx";
import ManagerSupplyRequests from "./pages/manager/SupplyRequests.jsx";
import ManagerOrderDetails from "./pages/manager/OrderDetails.jsx";
import SupplierLayout from "./pages/supplier/SupplierLayout.jsx";
import SupplierHome from "./pages/supplier/SupplierHome.jsx";
import SupplierProducts from "./pages/supplier/Products.jsx";
import SupplierSubmitRequest from "./pages/supplier/SubmitRequest.jsx";
import SupplierRequests from "./pages/supplier/Requests.jsx";
import SupplierProfile from "./pages/supplier/SupplierProfile.jsx";
import SalesLayout from "./pages/sales/SalesLayout.jsx";
import SalesOverview from "./pages/sales/SalesOverview.jsx";
import SalesProducts from "./pages/sales/Products.jsx";
import SalesCreateOrder from "./pages/sales/CreateOrder.jsx";
import SalesOrders from "./pages/sales/Orders.jsx";
import SalesOrderDetails from "./pages/sales/OrderDetails.jsx";

const ManagerWarehouses = lazy(() => import("./pages/manager/Warehouses.jsx"));
const ManagerInventory = lazy(() => import("./pages/manager/Inventory.jsx"));
const ManagerAddStock = lazy(() => import("./pages/manager/AddStock.jsx"));
const ManagerRemoveStock = lazy(() => import("./pages/manager/RemoveStock.jsx"));
const ManagerTransactions = lazy(() => import("./pages/manager/Transactions.jsx"));
const ManagerLowStock = lazy(() => import("./pages/manager/LowStock.jsx"));

function HomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <Loader />;
  return <Navigate to={isAuthenticated ? getDashboardPath(user.role) : "/login"} replace />;
}

function PublicOnly({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <Loader />;
  if (isAuthenticated) return <Navigate to={getDashboardPath(user.role)} replace />;
  return children;
}

function NotFound() {
  useEffect(() => {
    document.title = "Page not found | Inventory";
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg text-lg font-semibold text-app-text">
      404 Not Found
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}
      >
        <Route index element={<AdminOverview />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="users" element={<Users />} />
        <Route path="products" element={<Products />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/:id" element={<SupplierDetails />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<AdminOrderDetails />} />
        <Route path="supply-requests" element={<AdminSupplyRequests />} />
        <Route path="low-stock" element={<LowStock />} />
      </Route>
      <Route
        path="/manager"
        element={<ProtectedRoute allowedRoles={["warehouseManager"]}><ManagerLayout /></ProtectedRoute>}
      >
        <Route index element={<ManagerOverview />} />
        <Route path="warehouses" element={<ManagerWarehouses />} />
        <Route path="inventory" element={<ManagerInventory />} />
        <Route path="add-stock" element={<ManagerAddStock />} />
        <Route path="remove-stock" element={<ManagerRemoveStock />} />
        <Route path="transactions" element={<ManagerTransactions />} />
        <Route path="orders" element={<ManagerOrders />} />
        <Route path="orders/:id" element={<ManagerOrderDetails />} />
        <Route path="supply-requests" element={<ManagerSupplyRequests />} />
        <Route path="low-stock" element={<ManagerLowStock />} />
      </Route>
      <Route
        path="/supplier"
        element={<ProtectedRoute allowedRoles={["supplier"]}><SupplierLayout /></ProtectedRoute>}
      >
        <Route index element={<SupplierHome />} />
        <Route path="profile" element={<SupplierProfile />} />
        <Route path="products" element={<SupplierProducts />} />
        <Route path="submit-request" element={<SupplierSubmitRequest />} />
        <Route path="requests" element={<SupplierRequests />} />
      </Route>
      <Route
        path="/sales"
        element={<ProtectedRoute allowedRoles={["salesRepresentative"]}><SalesLayout /></ProtectedRoute>}
      >
        <Route index element={<SalesOverview />} />
        <Route path="products" element={<SalesProducts />} />
        <Route path="create-order" element={<SalesCreateOrder />} />
        <Route path="orders" element={<SalesOrders />} />
        <Route path="orders/:id" element={<SalesOrderDetails />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
