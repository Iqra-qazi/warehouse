import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getDashboardPath, useAuth } from "../../context/AuthContext.jsx";
import Loader from "../../components/Loader.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

const roles = [
  { value: "warehouseManager", label: "Warehouse Manager" },
  { value: "supplier", label: "Supplier" },
  { value: "salesRepresentative", label: "Sales Representative" },
];

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "",
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.phone.trim()) errors.phone = "Phone is required.";
  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  if (!roles.some((role) => role.value === form.role)) errors.role = "Select a role.";
  return errors;
}

export default function Register() {
  const { register, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    document.title = "Create account | Inventory";
  }, []);

  if (loading) return <Loader />;
  if (isAuthenticated) return <Navigate to={getDashboardPath(user.role)} replace />;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      const { confirmPassword, ...registrationData } = form;
      const registeredUser = await register(registrationData);
      toast.success("Account created successfully");
      navigate(getDashboardPath(registeredUser.role), { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  }

  function fieldClass(name) {
    return `h-10 w-full rounded-md border bg-app-surface px-3 text-app-text outline-none transition-colors focus:ring-2 ${
      errors[name]
        ? "border-danger focus:border-danger focus:ring-danger/20"
        : "border-app-border focus:border-accent focus:ring-accent/20"
    }`;
  }

  function renderError(name) {
    return errors[name] ? <p className="mt-1 text-xs text-danger">{errors[name]}</p> : null;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <section className="app-auth-card w-full max-w-xl rounded-lg border border-t-2 border-app-border border-t-accent bg-app-surface p-6 shadow-[0_12px_34px_rgba(27,54,76,0.08)] sm:p-9">
        <header className="mb-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-contrast">
              <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-sm font-bold text-app-text">Inventory</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">Warehouse operations</span>
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-app-text">Create account</h1>
          <p className="mt-1.5 text-sm text-app-muted">Enter your details to get started.</p>
        </header>

        <form className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="name">
              Full name
            </label>
            <input
              autoComplete="name"
              className={fieldClass("name")}
              id="name"
              name="name"
              onChange={updateField}
              value={form.name}
            />
            {renderError("name")}
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className={fieldClass("email")}
              id="email"
              name="email"
              onChange={updateField}
              type="email"
              value={form.email}
            />
            {renderError("email")}
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="phone">
              Phone
            </label>
            <input
              autoComplete="tel"
              className={fieldClass("phone")}
              id="phone"
              name="phone"
              onChange={updateField}
              type="tel"
              value={form.phone}
            />
            {renderError("phone")}
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="role">
              Role
            </label>
            <select
              className={fieldClass("role")}
              id="role"
              name="role"
              onChange={updateField}
              value={form.role}
            >
              <option value="">Select a role</option>
              {roles.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {renderError("role")}
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="new-password"
              className={fieldClass("password")}
              id="password"
              name="password"
              onChange={updateField}
              type="password"
              value={form.password}
            />
            {renderError("password")}
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-app-text" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              autoComplete="new-password"
              className={fieldClass("confirmPassword")}
              id="confirmPassword"
              name="confirmPassword"
              onChange={updateField}
              type="password"
              value={form.confirmPassword}
            />
            {renderError("confirmPassword")}
          </div>
          <button
            className="app-button flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-contrast shadow-sm transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-app-surface disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
            disabled={submitting}
            type="submit"
          >
            {submitting && (
              <span className="size-4 animate-spin rounded-full border-2 border-accent-contrast/30 border-t-accent-contrast" />
            )}
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 border-t border-app-border pt-5 text-center text-sm text-app-muted">
          Already registered?{" "}
          <Link className="font-medium text-accent hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
