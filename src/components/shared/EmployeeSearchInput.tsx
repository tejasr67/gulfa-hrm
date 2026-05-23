"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type EmployeeHit = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  department: { name: string } | null;
  position: { title: string } | null;
};

interface EmployeeSearchInputProps {
  /** Called with the database `id` (cuid) and full employee object when selected */
  onSelect: (employee: EmployeeHit) => void;
  /** Called when selection is cleared */
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  /** Pre-selected employee (for edit forms) */
  value?: EmployeeHit | null;
}

export function EmployeeSearchInput({
  onSelect,
  onClear,
  placeholder = "Search by EMP-ID or name…",
  className,
  value,
}: EmployeeSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EmployeeHit | null>(value ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/employees/lookup?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) { setResults(j.data); setOpen(true); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }

  function handleSelect(emp: EmployeeHit) {
    setSelected(emp);
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(emp);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    setResults([]);
    onClear?.();
  }

  // If an employee is selected, show their card
  if (selected) {
    return (
      <div className={cn("flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5", className)}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {selected.photo
            ? <img src={selected.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
            : <User className="h-4 w-4" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {selected.firstName} {selected.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {selected.employeeId}
            {selected.department && ` · ${selected.department.name}`}
            {selected.position && ` · ${selected.position.title}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {loading && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          {results.map((emp) => (
            <li key={emp.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(emp); }}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {emp.photo
                    ? <img src={emp.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                    : `${emp.firstName[0]}${emp.lastName[0] ?? ""}`
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.employeeId}
                    {emp.department && ` · ${emp.department.name}`}
                    {emp.position && ` · ${emp.position.title}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.length > 1 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-3 text-sm text-muted-foreground shadow-md">
          No employees found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
