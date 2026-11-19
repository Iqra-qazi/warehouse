import { useEffect, useRef, useState } from "react";
import Input from "./Input.jsx";
import useDebounce from "../hooks/useDebounce.js";

export default function SearchInput({
  value = "",
  onChange,
  placeholder = "Search...",
}) {
  const [draft, setDraft] = useState(value);
  const debouncedValue = useDebounce(draft, 400);
  const currentValue = useRef(value);
  currentValue.current = value;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debouncedValue !== currentValue.current) onChange?.(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <Input
      aria-label={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      placeholder={placeholder}
      type="search"
      value={draft}
    />
  );
}
