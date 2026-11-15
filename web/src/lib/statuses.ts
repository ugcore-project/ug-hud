/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// One list for every bar: core statuses, ug-core needs and statuses other resources added.

import { DEFAULT_LOOK, type Alerts, type Settings } from "@/lib/settings";
import type { CustomStatus, PlayerData } from "@/types/protocol";

export interface StatusEntry {
  name: string;
  label: string;
  icon: string;
  color: string;
  value: number;
  /** Low, or high for statuses where more is worse. Drives the warning pulse. */
  warn: boolean;
}

/** Needs that come first, in this order. Other needs follow by name, and needs where more is worse come last. */
const NEED_ORDER = ["hunger", "thirst"];

function needRank(name: string, inverted: ReadonlySet<string>): number {
  const index = NEED_ORDER.indexOf(name);

  if (inverted.has(name)) return NEED_ORDER.length + 1;

  return index === -1 ? NEED_ORDER.length : index;
}

export interface StatusSources {
  player: PlayerData | null;
  needs: Record<string, number>;
  statuses: CustomStatus[];
  labels: Record<string, string>;
  needLabels: Record<string, string>;
  /** The owner's bar colors. DEFAULT_LOOK's when left out. */
  colors?: Record<string, string>;
  /** The owner's warning levels. DEFAULT_LOOK's when left out. */
  alerts?: Alerts;
}

/** Every status the player has, with its color and warning state. Hidden ones are left out unless `all`. */
export function collectStatuses(sources: StatusSources, settings: Settings, all = false): StatusEntry[] {
  const entries: StatusEntry[] = [];
  const { player, labels } = sources;
  const alerts = sources.alerts ?? DEFAULT_LOOK.alerts;
  const colors = sources.colors ?? DEFAULT_LOOK.statusColors;
  const inverted: ReadonlySet<string> = new Set(alerts.inverted);
  const warns = (name: string, value: number) => (inverted.has(name) ? value >= alerts.highStatus : value <= alerts.lowStatus);
  const add = (name: string, label: string, icon: string, value: number, color?: string, optional = false) => {
    const own = settings.statuses[name];

    if (!all && own?.visible === false) {
      return;
    }

    // Optional statuses, such as armor, are not a warning when empty.
    const warn = !optional && warns(name, value);

    // Smart hide: a full bar, or an empty optional one, says nothing, so it waits until it changes.
    if (!all && settings.smartHide && !warn && (inverted.has(name) ? value <= 0 : value >= 99 || (optional && value <= 0))) {
      return;
    }

    entries.push({ name, label, icon, value, color: own?.color ?? color ?? colors[name] ?? "#a78bfa", warn });
  };

  if (player) {
    add("health", labels["status.health"] ?? "Health", "health", player.health);
    add("armor", labels["status.armor"] ?? "Armor", "armor", player.armor, undefined, true);
    add("stamina", labels["status.stamina"] ?? "Stamina", "stamina", player.stamina);

    if (player.underwater || all) {
      add("oxygen", labels["status.oxygen"] ?? "Oxygen", "oxygen", player.oxygen);
    }
  }

  const needs = Object.keys(sources.needs).sort((a, b) => needRank(a, inverted) - needRank(b, inverted) || a.localeCompare(b));

  for (const name of needs) {
    add(name, sources.needLabels[name] ?? name, name, sources.needs[name] ?? 0);
  }

  for (const status of sources.statuses) {
    add(status.name, status.label, status.icon, status.value, status.color);
  }

  return entries;
}
