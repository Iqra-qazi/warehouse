import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/Button.jsx";
import ImageUploader from "../../components/ImageUploader.jsx";
import Input from "../../components/Input.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function SupplierProfile() {
  const { user, updateProfile, updateProfileImage } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [address, setAddress] = useState(user?.address || "");
  const [pendingImage, setPendingImage] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  async function saveSupplierFields(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        companyName: companyName.trim(),
        address: address.trim(),
      });
      toast.success("Supplier profile updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to update supplier profile.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfileImage() {
    if (pendingImage === undefined || savingImage) return;
    setSavingImage(true);
    try {
      await updateProfileImage(pendingImage);
      setPendingImage(undefined);
      toast.success("Supplier logo updated successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to update supplier logo.");
    } finally {
      setSavingImage(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Supplier Profile" subtitle="Manage your company details and logo." />
      <form className="space-y-5 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm sm:p-7" onSubmit={saveSupplierFields}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Email" value={user?.email || ""} readOnly />
          <Input label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Input label="Company name" maxLength={160} value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
        </div>
        <label className="block text-sm font-medium text-app-text" htmlFor="supplier-address">Address</label>
        <textarea id="supplier-address" className="min-h-24 w-full h-9 rounded-md border border-app-border bg-app-surface px-3 text-app-text text-sm" maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} />
        <div className="flex justify-end"><Button loading={saving} type="submit">{saving ? "Saving..." : "Save Profile"}</Button></div>
      </form>
      <section className="mt-5 rounded-lg border border-app-border bg-app-surface p-5 shadow-sm sm:p-7">
        <ImageUploader disabled={savingImage} label="Supplier Logo / Profile Image"
          onUpload={setPendingImage} value={{ url: user?.image || "", fileId: user?.imageFileId || "" }} />
        {pendingImage !== undefined && <div className="mt-4 flex justify-end"><Button loading={savingImage} onClick={saveProfileImage}>{savingImage ? "Saving..." : "Save Profile Image"}</Button></div>}
      </section>
    </div>
  );
}
