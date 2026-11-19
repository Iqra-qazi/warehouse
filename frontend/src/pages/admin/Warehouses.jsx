import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios.js";
import Button from "../../components/Button.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DataTable from "../../components/DataTable.jsx";
import Input from "../../components/Input.jsx";
import Modal from "../../components/Modal.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import Select from "../../components/Select.jsx";

function emptyForm() {
  return { name: "", location: "", capacity: "1", manager: "" };
}

function getArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  return [];
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const [warehouseResponse, managerResponse] = await Promise.all([
        api.get("/warehouses", { params: { search: search || undefined } }),
        api.get("/users", { params: { role: "warehouseManager" } }),
      ]);
      setWarehouses(getArray(warehouseResponse.data, "warehouses"));
      setManagers(getArray(managerResponse.data, "users"));
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load warehouses and managers.");
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateModal() {
    setEditingWarehouse(null);
    setForm(emptyForm());
    setFormErrors({});
    setModalOpen(true);
  }

  function openEditModal(warehouse) {
    setEditingWarehouse(warehouse);
    setForm({
      name: warehouse?.name || "",
      location: warehouse?.location || "",
      capacity: warehouse?.capacity === undefined ? "" : String(warehouse.capacity),
      manager: String(warehouse?.manager?._id || warehouse?.manager || ""),
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
  }

  function validateForm() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Warehouse name is required.";
    if (!form.location.trim()) errors.location = "Location is required.";
    const capacity = Number(form.capacity);
    if (!form.capacity || !Number.isFinite(capacity) || capacity <= 0) {
      errors.capacity = "Capacity must be a number greater than 0.";
    }
    if (form.manager && !managers.some((manager) => manager?._id === form.manager)) {
      errors.manager = "Select an existing warehouse manager.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      capacity: Number(form.capacity),
      manager: form.manager || null,
    };

    setSaving(true);
    try {
      if (editingWarehouse?._id) {
        await api.put(`/warehouses/${editingWarehouse._id}`, payload);
        toast.success("Warehouse updated successfully.");
      } else {
        await api.post("/warehouses", payload);
        toast.success("Warehouse created successfully.");
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save warehouse."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!warehouseToDelete?._id || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/warehouses/${warehouseToDelete._id}`);
      toast.success("Warehouse deleted successfully.");
      setWarehouseToDelete(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete warehouse."));
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (warehouse) => (
        <span className="font-medium text-app-text">{warehouse?.name || "—"}</span>
      ),
    },
    { key: "location", header: "Location", render: (warehouse) => warehouse?.location || "—" },
    {
      key: "manager",
      header: "Manager",
      render: (warehouse) => warehouse?.manager ? (
        <div>
          <p className="font-medium text-app-text">{warehouse.manager?.name || "—"}</p>
          <p className="mt-0.5 text-xs text-app-muted">{warehouse.manager?.email || "—"}</p>
        </div>
      ) : <span className="text-app-muted">Unassigned</span>,
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (warehouse) => warehouse?.capacity ?? "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (warehouse) => (
        <div className="flex items-center gap-2">
          <Button onClick={() => openEditModal(warehouse)} size="sm" variant="secondary">
            Edit
          </Button>
          <Button
            onClick={() => setWarehouseToDelete(warehouse)}
            size="sm"
            variant="danger"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        action={<Button onClick={openCreateModal}>Add Warehouse</Button>}
        subtitle="Manage warehouse locations, capacity, and manager assignments."
        title="Warehouses"
      />

      <div className="mb-5 max-w-xl">
        <SearchInput
          onChange={setSearch}
          placeholder="Search warehouses by name..."
          value={search}
        />
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
        data={warehouses}
        emptyMessage="No warehouses match this search."
        loading={loading}
      />

      <Modal
        closeOnBackdrop={!saving}
        closeOnEscape={!saving}
        isOpen={modalOpen}
        onClose={closeModal}
        size="lg"
        title={editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
      >
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              error={formErrors.name}
              label="Warehouse name"
              name="name"
              onChange={updateField}
              required
              value={form.name}
            />
            <Input
              error={formErrors.location}
              label="Location"
              name="location"
              onChange={updateField}
              required
              value={form.location}
            />
            <Input
              error={formErrors.capacity}
              label="Capacity"
              min="1"
              name="capacity"
              onChange={updateField}
              required
              type="number"
              value={form.capacity}
            />
            <Select
              error={formErrors.manager}
              label="Manager"
              name="manager"
              onChange={updateField}
              value={form.manager}
            >
              <option value="">Unassigned</option>
              {managers.map((manager) => (
                <option key={manager?._id} value={manager?._id}>
                  {manager?.name || manager?.email || "Warehouse Manager"}
                  {manager?.email ? ` (${manager.email})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-3 border-t border-app-border pt-4">
            <Button disabled={saving} onClick={closeModal} variant="secondary">
              Cancel
            </Button>
            <Button loading={saving} type="submit">
              {saving ? "Saving..." : editingWarehouse ? "Save Changes" : "Create Warehouse"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmText="Delete Warehouse"
        danger
        isOpen={Boolean(warehouseToDelete)}
        loading={deleting}
        message={`Delete ${warehouseToDelete?.name || "this warehouse"}? Warehouses with stock cannot be deleted.`}
        onCancel={() => {
          if (!deleting) setWarehouseToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Warehouse"
      />
    </div>
  );
}
