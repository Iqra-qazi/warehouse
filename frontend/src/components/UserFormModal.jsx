import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Button from "./Button.jsx";
import ImageUploader from "./ImageUploader.jsx";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";
import Select from "./Select.jsx";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "warehouseManager", label: "Warehouse Manager" },
  { value: "supplier", label: "Supplier" },
  { value: "salesRepresentative", label: "Sales Representative" },
];

function makeForm(user, lockedRole) {
  const assignedWarehouses = Array.isArray(user?.assignedWarehouses)
    ? user.assignedWarehouses.map((warehouse) =>
      typeof warehouse === "string" ? warehouse : warehouse?._id
    ).filter(Boolean)
    : [];
  return {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    role: lockedRole || user?.role || "salesRepresentative",
    assignedWarehouses,
    image: user?.image || "",
    imageFileId: user?.imageFileId || "",
    companyName: user?.companyName || "",
    address: user?.address || "",
  };
}

export default function UserFormModal({
  isOpen,
  user = null,
  warehouses = [],
  lockedRole = null,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => makeForm(user, lockedRole));
  const [imageTouched, setImageTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const editing = Boolean(user?._id);

  useEffect(() => {
    if (!isOpen) return;
    setForm(makeForm(user, lockedRole));
    setImageTouched(false);
    setErrors({});
  }, [isOpen, lockedRole, user]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function toggleWarehouse(warehouseId) {
    setForm((current) => {
      const assigned = Array.isArray(current.assignedWarehouses) ? current.assignedWarehouses : [];
      return {
        ...current,
        assignedWarehouses: assigned.includes(warehouseId)
          ? assigned.filter((id) => id !== warehouseId)
          : [...assigned, warehouseId],
      };
    });
  }

  function validate() {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!editing && !form.password) nextErrors.password = "Password is required.";
    else if (form.password && form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    if (!roleOptions.some((role) => role.value === form.role)) nextErrors.role = "Select a valid role.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (uploadingImage || !validate()) return;

    const role = lockedRole || form.role;
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role,
      assignedWarehouses: role === "warehouseManager" ? form.assignedWarehouses : [],
    };
    if (!editing || form.password) payload.password = form.password;
    if (role === "supplier") {
      payload.companyName = form.companyName.trim();
      payload.address = form.address.trim();
    }
    if (imageTouched) {
      payload.image = form.image || null;
      payload.imageFileId = form.imageFileId || null;
    }

    setSaving(true);
    try {
      if (user?._id) {
        await api.put(`/users/${user._id}`, payload);
        toast.success("User updated successfully.");
      } else {
        await api.post("/users", payload);
        toast.success("User created successfully.");
      }
      onClose?.();
      await onSaved?.();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || requestError.message || "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    if (!saving && !uploadingImage) onClose?.();
  }

  return (
    <Modal
      closeOnEscape={!saving && !uploadingImage}
      closeOnBackdrop={!saving && !uploadingImage}
      isOpen={isOpen}
      onClose={close}
      size="lg"
      title={editing ? "Edit User" : lockedRole === "supplier" ? "Add Supplier" : "Add User"}
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input autoComplete="name" error={errors.name} label="Name" name="name" onChange={updateField} required value={form.name} />
          <Input autoComplete="email" error={errors.email} label="Email" name="email" onChange={updateField} required type="email" value={form.email} />
          <Input autoComplete="tel" label="Phone" name="phone" onChange={updateField} type="tel" value={form.phone} />
          <Input autoComplete="new-password" error={errors.password} hint={editing ? "Leave blank to keep current." : "At least 6 characters."}
            label="Password" name="password" onChange={updateField} required={!editing} type="password" value={form.password} />
          <Select disabled={Boolean(lockedRole)} error={errors.role} label="Role" name="role" onChange={updateField} required value={form.role}>
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </Select>
          {form.role === "supplier" && <>
            <Input label="Company name" maxLength={160} name="companyName" onChange={updateField} value={form.companyName} />
            <label className="text-[12.5px] font-medium text-app-text md:col-span-2" htmlFor="user-address">
              Address
              <textarea id="user-address" className="mt-1 min-h-20 w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm font-normal text-app-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" maxLength={500}
                name="address" value={form.address} onChange={updateField} />
            </label>
          </>}

          <div className="md:col-span-2">
            <ImageUploader disabled={saving || uploadingImage} label="Profile Image" onUploadingChange={setUploadingImage}
              onUpload={(image) => {
                setImageTouched(true);
                setForm((current) => ({ ...current, image: image?.url || "", imageFileId: image?.fileId || "" }));
              }}
              value={{ url: form.image, fileId: form.imageFileId }} />
          </div>

          {form.role === "warehouseManager" && <fieldset className="rounded-lg border border-app-border p-4 md:col-span-2">
            <legend className="px-1 text-sm font-medium text-app-text">Assigned Warehouses</legend>
            {warehouses.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {warehouses.map((warehouse) => <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm text-app-text hover:bg-app-subtle" key={warehouse?._id}>
                <input checked={form.assignedWarehouses.includes(warehouse?._id)} className="mt-0.5 size-4 rounded border-app-border text-accent focus:ring-accent"
                  onChange={() => toggleWarehouse(warehouse?._id)} type="checkbox" />
                <span><span className="block font-medium">{warehouse?.name || "Warehouse"}</span><span className="text-xs text-app-muted">{warehouse?.location || "—"}</span></span>
              </label>)}
            </div> : <p className="text-sm text-app-muted">No warehouses available.</p>}
          </fieldset>}
        </div>
        <div className="flex justify-end gap-2 border-t border-app-border pt-4">
          <Button disabled={saving || uploadingImage} onClick={close} variant="secondary">Cancel</Button>
          <Button disabled={uploadingImage} loading={saving} type="submit">{saving ? "Saving..." : editing ? "Save Changes" : lockedRole === "supplier" ? "Create Supplier" : "Create User"}</Button>
        </div>
      </form>
    </Modal>
  );
}
