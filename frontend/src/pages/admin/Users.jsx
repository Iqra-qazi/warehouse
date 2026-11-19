import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import Select from "../../components/Select.jsx";
import UserFormModal from "../../components/UserFormModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "warehouseManager", label: "Warehouse Manager" },
  { value: "supplier", label: "Supplier" },
  { value: "salesRepresentative", label: "Sales Representative" },
];

const roleStyles = {
  admin: "bg-app-subtle text-app-muted",
  warehouseManager: "bg-app-subtle text-app-muted",
  supplier: "bg-app-subtle text-app-muted",
  salesRepresentative: "bg-app-subtle text-app-muted",
};

function getArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  return [];
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const [usersResponse, warehousesResponse] = await Promise.all([
        api.get("/users", { params: { search: search || undefined, role: roleFilter || undefined } }),
        api.get("/warehouses"),
      ]);
      setUsers(getArray(usersResponse.data, "users"));
      setWarehouses(getArray(warehousesResponse.data, "warehouses"));
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load users and warehouses.");
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateModal() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEditModal(targetUser) {
    setEditingUser(targetUser);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!userToDelete?._id || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${userToDelete._id}`);
      toast.success("User deleted successfully.");
      setUserToDelete(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete user."));
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "avatar",
      header: "Avatar",
      render: (row) => row?.image ? (
        <img alt="" className="size-9 rounded-full object-cover" src={row.image} />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
          {row?.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-app-text">{row?.name || "—"}</span>,
    },
    { key: "email", header: "Email", render: (row) => row?.email || "—" },
    { key: "phone", header: "Phone", render: (row) => row?.phone || "—" },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${roleStyles[row?.role] || "bg-app-subtle text-app-muted"}`}>
          {roleOptions.find((role) => role.value === row?.role)?.label || row?.role || "—"}
        </span>
      ),
    },
    {
      key: "assignedWarehouses",
      header: "Assigned Warehouses",
      render: (row) => {
        const assigned = Array.isArray(row?.assignedWarehouses)
          ? row.assignedWarehouses.filter(Boolean)
          : [];
        return assigned.length ? (
          <div className="flex min-w-36 flex-wrap gap-1.5">
            {assigned.map((warehouse, index) => (
              <span
                className="rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success"
                key={warehouse?._id || warehouse || index}
              >
                {typeof warehouse === "string" ? warehouse : warehouse?.name || "Warehouse"}
              </span>
            ))}
          </div>
        ) : "—";
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const isCurrentUser = String(row?._id || "") === String(currentUser?._id || "");
        return (
          <div className="flex items-center gap-2">
            <Button onClick={() => openEditModal(row)} size="sm" variant="secondary">
              Edit
            </Button>
            <Button
              disabled={isCurrentUser}
              onClick={() => setUserToDelete(row)}
              size="sm"
              title={isCurrentUser ? "You cannot delete your own account." : "Delete user"}
              variant="danger"
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        action={<Button onClick={openCreateModal}>Add User</Button>}
        subtitle="Manage accounts, roles, and warehouse assignments."
        title="Users"
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <SearchInput
          onChange={setSearch}
          placeholder="Search by name or email..."
          value={search}
        />
        <Select
          aria-label="Filter users by role"
          onChange={(event) => setRoleFilter(event.target.value)}
          value={roleFilter}
        >
          <option value="">All roles</option>
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </Select>
      </div>

      {listError && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-danger-soft bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-danger">{listError}</p>
          <Button disabled={loading} onClick={loadData} size="sm" variant="danger">
            Retry
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        emptyMessage="No users match these filters."
        loading={loading}
      />

      <UserFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSaved={loadData}
        user={editingUser}
        warehouses={warehouses}
      />

      <ConfirmDialog
        confirmText="Delete User"
        danger
        isOpen={Boolean(userToDelete)}
        loading={deleting}
        message={`Delete ${userToDelete?.name || "this user"}? This action cannot be undone.`}
        onCancel={() => {
          if (!deleting) setUserToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete User"
      />
    </div>
  );
}
