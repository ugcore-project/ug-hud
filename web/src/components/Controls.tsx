/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Small editor controls.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-white">{label}</span>
        {hint && <span className="text-[11px] text-white/45">{hint}</span>}
      </span>
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-[var(--hud-accent)]" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (number) => `${Math.round(number * 100)}%`,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1 px-2 py-1">
      <span className="flex justify-between text-xs font-medium text-white/70">
        {label}
        <span className="tabular-nums text-white">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[var(--hud-accent)]"
      />
    </label>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      {label && <span className="text-xs font-medium text-white/70">{label}</span>}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-semibold capitalize transition-colors",
              option.value === value ? "bg-[var(--hud-accent)] text-black" : "text-white/70 hover:bg-white/10",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="px-2 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{title}</h3>
      {children}
    </section>
  );
}
