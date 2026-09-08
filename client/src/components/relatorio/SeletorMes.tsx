import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { MONTHS } from "@/lib/report";
import { useState } from "react";

export function SeletorMes({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, index) => currentYear - index);

  const go = (deltaMonth: number) => {
    const total = year * 12 + (month - 1) + deltaMonth;
    if (total < 0) return;
    onChange((total % 12) + 1, Math.floor(total / 12));
  };

  return (
    <div className="space-y-2">
      <Label className="tiny-label">Mês / Ano</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => go(-1)}
          className="h-11 w-11 shrink-0 rounded-none border-stone-900/25 px-0"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              setMonthOpen(value => !value);
              setYearOpen(false);
            }}
            className="admin-input flex h-11 w-full items-center justify-between px-4 text-left text-sm font-medium"
          >
            <span className="font-serif text-lg tracking-tight">{MONTHS[month - 1]}</span>
            <ChevronDown className="h-4 w-4 text-stone-500" />
          </button>
          {monthOpen && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto border border-stone-900/20 bg-[#fbf7ee] shadow-[0_18px_34px_-18px_rgba(42,36,28,.5)]">
              {MONTHS.map((name, index) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => {
                    onChange(index + 1, year);
                    setMonthOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-stone-900 hover:text-[#fbf7ee] ${index + 1 === month ? "font-bold" : "text-stone-800"}`}
                >
                  {name}
                  {index + 1 === month && <span className="text-[10px] tracking-[0.12em]">ATUAL</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              setYearOpen(value => !value);
              setMonthOpen(false);
            }}
            className="admin-input flex h-11 w-full items-center justify-between px-4 text-left font-serif text-lg tracking-tight"
          >
            {year}
            <ChevronUp className="h-4 w-4 text-stone-500" />
          </button>
          {yearOpen && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto border border-stone-900/20 bg-[#fbf7ee] shadow-[0_18px_34px_-18px_rgba(42,36,28,.5)]">
              {Array.from(years, candidate => (
                <button
                  type="button"
                  key={candidate}
                  onClick={() => {
                    onChange(month, candidate);
                    setYearOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left font-serif text-base transition-colors hover:bg-stone-900 hover:text-[#fbf7ee] ${candidate === year ? "text-stone-900" : "text-stone-700"}`}
                >
                  {candidate}
                  {candidate === year && <span className="text-[10px] tracking-[0.12em]">ATUAL</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => go(1)}
          className="h-11 w-11 shrink-0 rounded-none border-stone-900/25 px-0"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}