import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

const dashboardPaths = {
  admin: "/admin",
  warehouseManager: "/manager",
  supplier: "/supplier",
  salesRepresentative: "/sales",
};

export function getDashboardPath(role) {
  return dashboardPaths[role] || "/login";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const storedToken = window.localStorage.getItem("token");

    if (!storedToken) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setToken(storedToken);
    api.get("/auth/me")
      .then(({ data }) => {
        if (active) setUser(data?.user ?? null);
      })
      .catch(() => {
        if (!active) return;
        window.localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    if (!data?.token || !data?.user) {
      throw new Error("The server returned an invalid login response");
    }
    window.localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(registrationData) {
    const { data } = await api.post("/auth/register", registrationData);
    if (!data?.token || !data?.user) {
      throw new Error("The server returned an invalid registration response");
    }
    window.localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function updateProfileImage(image) {
    const body = {
      image: image?.url ?? null,
      imageFileId: image?.fileId ?? null,
    };
    if ((body.image && !body.imageFileId) || (!body.image && body.imageFileId)) {
      throw new Error("Image URL and file ID must be provided together");
    }

    const { data } = await api.put("/users/me/image", body);
    if (!data?.user || typeof data.user !== "object") {
      throw new Error("The server returned an invalid profile response");
    }
    setUser(data.user);
    return data.user;
  }

  async function updateProfile(fields) {
    if (!user?._id) throw new Error("You must be signed in to update your profile");
    const { data } = await api.put(`/users/${user._id}`, fields);
    if (!data?.user || typeof data.user !== "object") {
      throw new Error("The server returned an invalid profile response");
    }
    setUser(data.user);
    return data.user;
  }

  function logout() {
    window.localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    updateProfileImage,
    updateProfile,
    logout,
    isAuthenticated: Boolean(user && token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
