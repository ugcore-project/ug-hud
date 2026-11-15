/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Clock and weapon: one line each.

import { Clock as ClockIcon, Crosshair } from "lucide-react";
import { cn } from "@/lib/cn";
import { clock } from "@/lib/format";
import type { WeaponData } from "@/types/protocol";

const CARD = "rounded-xl border border-white/10 bg-black/55 px-3 py-1.5 shadow-ug-lg backdrop-blur-md";

export function Clock({ hours, minutes, use24, style }: { hours: number; minutes: number; use24: boolean; style: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-white", style === "card" ? CARD : "ug-hud-shadow")}>
      <ClockIcon className={cn("h-3.5 w-3.5", style === "card" ? "text-primary" : "text-[var(--hud-accent)]")} strokeWidth={2.5} />
      <span className="text-sm font-bold tabular-nums">{clock(hours, minutes, use24)}</span>
    </div>
  );
}

export function Weapon({ weapon, style }: { weapon: WeaponData; style: string }) {
  const empty = weapon.clip === 0;

  return (
    <div className={cn("flex items-center gap-2 text-white", style === "card" ? CARD : "ug-hud-shadow")} data-clip={weapon.clip}>
      <Crosshair className={cn("h-4 w-4", style === "card" ? "text-orange-400" : "text-[var(--hud-accent)]")} strokeWidth={2.5} />
      <span className={cn("text-lg font-black tabular-nums", empty && "text-destructive ug-hud-pulse")}>{weapon.clip}</span>
      <span className="text-xs font-semibold tabular-nums text-white/50">/ {weapon.total}</span>
    </div>
  );
}
