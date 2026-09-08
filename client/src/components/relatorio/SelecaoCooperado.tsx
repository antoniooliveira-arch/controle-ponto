import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type CooperadoOpcao = {
  id: number;
  fullName: string;
  registration: string;
};

export function SelecaoCooperado({
  cooperados,
  value,
  onChange,
  disabled,
}: {
  cooperados: CooperadoOpcao[];
  value: CooperadoOpcao | null;
  onChange: (value: CooperadoOpcao | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.fullName);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cooperados;
    return cooperados.filter(item =>
      `${item.fullName} ${item.registration}`.toLowerCase().includes(term),
    );
  }, [cooperados, query]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) setOpen(true);
    if (event.key === "ArrowDown" && filtered.length) {
      event.preventDefault();
      setFocused(current => (current === null ? 0 : Math.min(current + 1, filtered.length - 1)));
    }
    if (event.key === "ArrowUp" && filtered.length) {
      event.preventDefault();
      setFocused(current => (current === null ? filtered.length - 1 : Math.max(current - 1, 0)));
    }
    if (event.key === "Enter" && focused !== null && filtered[focused]) {
      event.preventDefault();
      onChange(filtered[focused]);
      setOpen(false);
    }
    if (event.key === "Escape") setOpen(false);
  };

  return (
    <div className="space-y-2" ref={rootRef}>
      <Label className="tiny-label">Cooperado (a)</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          disabled={disabled}
          onChange={event => {
            setQuery(event.target.value);
            setOpen(true);
            if (value?.fullName !== event.target.value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar por nome ou matrícula…"
          className="admin-input pl-10 pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => setOpen(value => !value)}
          className="absolute right-1 top-1 h-8 w-8 text-stone-500"
          aria-label="Alternar lista de cooperados"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      </div>
      {open && (
        <div className="z-30 mt-1 max-h-64 overflow-y-auto border border-stone-900/20 bg-[#fbf7ee] shadow-[0_18px_34px_-18px_rgba(42,36,28,.5)]">
          {filtered.length ? (
            filtered.map((item, index) => {
              const selected = value?.id === item.id;
              const isFocused = focused === index;
              return (
                <button
                  type="button"
                  key={item.id}
                  onMouseEnter={() => setFocused(index)}
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  onFocus={() => setFocused(index)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${isFocused ? "bg-stone-900 text-[#fbf7ee]" : "text-stone-800 hover:bg-stone-900 hover:text-[#fbf7ee]"}`}
                >
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{item.fullName}</strong>
                    <span className={`block truncate text-[11px] ${isFocused ? "text-[#d7d2c8]" : "text-stone-500"}`}>
                      Matrícula {item.registration}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-6 text-center text-sm text-stone-500">Nenhum cooperado encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}