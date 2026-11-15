/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { iconFor } from "@/lib/icons";
import type { StatusEntry } from "@/lib/statuses";

interface StatusProps {
  entries: StatusEntry[];
  style: string;
  /** Warning pulses. */
  effects: boolean;
}

// Room around the ring so its glow is never cut by the SVG box.
const RING = 21;
const BOX = 56;
const CENTER = BOX / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING;

function Ring({ entry, effects }: { entry: StatusEntry; effects: boolean }) {
  const Icon = iconFor(entry.icon);

  return (
    <div className={cn("relative h-14 w-14", effects && entry.warn && "ug-hud-pulse")} title={entry.label} data-status={entry.name}>
      <svg viewBox={`0 0 ${BOX} ${BOX}`} overflow="visible" className="absolute inset-0 -rotate-90">
        <circle cx={CENTER} cy={CENTER} r={RING} fill="rgb(0 0 0 / 0.55)" stroke="rgb(255 255 255 / 0.1)" strokeWidth="4.5" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RING}
          fill="none"
          stroke={entry.color}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - entry.value / 100)}
          style={{ transition: "stroke-dashoffset 400ms ease-out", filter: `drop-shadow(0 0 5px ${entry.color})` }}
        />
      </svg>
      <Icon className="absolute inset-0 m-auto h-5 w-5" style={{ color: entry.color }} strokeWidth={2.5} />
    </div>
  );
}

function Bar({ entry, effects }: { entry: StatusEntry; effects: boolean }) {
  const Icon = iconFor(entry.icon);

  return (
    <div className={cn("flex w-52 items-center gap-2.5", effects && entry.warn && "ug-hud-pulse")} title={entry.label} data-status={entry.name}>
      <Icon className="h-4 w-4 shrink-0" style={{ color: entry.color }} strokeWidth={2.5} />
      <div className="h-3 flex-1 rounded-full bg-black/55 ring-1 ring-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${entry.value}%`, background: entry.color, boxShadow: `0 0 8px ${entry.color}`, transition: "width 400ms ease-out" }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums text-white/80">{Math.round(entry.value)}</span>
    </div>
  );
}

function Pill({ entry, effects }: { entry: StatusEntry; effects: boolean }) {
  const Icon = iconFor(entry.icon);

  return (
    <div className={cn("flex flex-col items-center gap-1", effects && entry.warn && "ug-hud-pulse")} title={entry.label} data-status={entry.name}>
      <div className="relative h-16 w-5 rounded-full bg-black/55 ring-1 ring-white/10">
        <div
          className="absolute inset-x-0 bottom-0 rounded-full"
          style={{ height: `${entry.value}%`, background: entry.color, boxShadow: `0 0 10px ${entry.color}`, transition: "height 400ms ease-out" }}
        />
      </div>
      <Icon className="h-4 w-4" style={{ color: entry.color }} strokeWidth={2.5} />
    </div>
  );
}

function Minimal({ entry, effects }: { entry: StatusEntry; effects: boolean }) {
  const Icon = iconFor(entry.icon);

  return (
    <div className={cn("flex items-center gap-1 text-white ug-hud-shadow", effects && entry.warn && "ug-hud-pulse")} title={entry.label} data-status={entry.name}>
      <Icon className="h-3.5 w-3.5" style={{ color: entry.color }} strokeWidth={2.5} />
      <span className="text-xs font-semibold tabular-nums">{Math.round(entry.value)}</span>
    </div>
  );
}

const ITEMS: Record<string, typeof Ring> = { rings: Ring, bars: Bar, pills: Pill, minimal: Minimal };

export function Status({ entries, style, effects }: StatusProps) {
  const Item = ITEMS[style] ?? Ring;

  return (
    <div className={cn("flex", style === "bars" ? "flex-col gap-2 p-1" : "items-end gap-2.5 p-1")}>
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <Item entry={entry} effects={effects} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
