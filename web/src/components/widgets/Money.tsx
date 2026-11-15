/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, Landmark, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { delta, money } from "@/lib/format";

interface MoneyProps {
  accounts: string[];
  values: Record<string, number>;
  labels: Record<string, string>;
  locale: string;
  style: string;
}

interface Floater {
  id: number;
  account: string;
  amount: number;
}

const FLOATER_MS = 2200;
const ICONS: Record<string, typeof Wallet> = { cash: Banknote, bank: Landmark };
// The card style gives known accounts their own color. Other styles and accounts use the HUD accent.
const ACCOUNT_COLORS: Record<string, string> = { cash: "text-success", bank: "text-[var(--hud-accent)]" };

let nextId = 0;

/** Changes since the last values, as floaters that rise and fade. The first values make none. */
function useFloaters(values: Record<string, number>): Floater[] {
  const previous = useRef<Record<string, number> | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const before = previous.current;

    previous.current = values;

    if (!before) {
      return;
    }

    const added: Floater[] = [];

    for (const [account, value] of Object.entries(values)) {
      const old = before[account];

      if (old !== undefined && old !== value) {
        added.push({ id: ++nextId, account, amount: value - old });
      }
    }

    if (added.length === 0) {
      return;
    }

    setFloaters((current) => [...current, ...added].slice(-6));

    // Each batch removes itself, even when values change again before it ends.
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setFloaters((current) => current.filter((floater) => !added.includes(floater)));
    }, FLOATER_MS);

    timers.current.add(timer);
  }, [values]);

  useEffect(() => {
    const pending = timers.current;

    return () => {
      for (const timer of pending) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return floaters;
}

export function Money({ accounts, values, labels, locale, style }: MoneyProps) {
  const floaters = useFloaters(values);
  const shown = accounts.filter((account) => values[account] !== undefined);
  const card = style === "card";

  return (
    <div className="flex flex-col items-end gap-1">
      {shown.map((account) => {
        const Icon = ICONS[account] ?? Wallet;
        const value = values[account] ?? 0;

        return (
          <div
            key={account}
            data-account={account}
            className={cn(
              "relative flex items-center gap-2 text-white",
              card ? "rounded-xl border border-white/10 bg-black/55 px-3 py-1.5 shadow-ug-lg backdrop-blur-md" : "ug-hud-shadow",
            )}
          >
            <Icon className={cn("h-4 w-4", (card && ACCOUNT_COLORS[account]) || "text-[var(--hud-accent)]")} strokeWidth={2.5} />
            {card && <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{labels[account] ?? account}</span>}
            <span className={cn("font-bold tabular-nums", value < 0 && "text-destructive", card ? "text-sm" : "text-base")}>{money(value, locale)}</span>
            <AnimatePresence>
              {floaters
                .filter((floater) => floater.account === account)
                .map((floater) => (
                  <motion.span
                    key={floater.id}
                    data-floater={floater.amount}
                    initial={{ opacity: 0, y: 6, scale: 0.8 }}
                    animate={{ opacity: 1, y: 18, scale: 1 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.5 }}
                    className={cn("absolute right-2 top-full text-sm font-bold tabular-nums ug-hud-shadow", floater.amount >= 0 ? "text-success" : "text-destructive")}
                  >
                    {delta(floater.amount, locale)}
                  </motion.span>
                ))}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
