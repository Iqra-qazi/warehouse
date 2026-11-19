import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const storageKey = "inventory-theme-v2";
const themes = new Set(["light", "dark", "system"]);

function readTheme() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return themes.has(saved) ? saved : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const dark = theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);

  const setTheme = useCallback((nextTheme) => {
    if (!themes.has(nextTheme)) return;
    setThemeState(nextTheme);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Theme remains active for this session when storage is unavailable.
    }

    applyTheme(theme);
    if (theme !== "system") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => applyTheme("system");
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
