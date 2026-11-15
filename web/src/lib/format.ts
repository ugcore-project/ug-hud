/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { SPEED_FACTOR } from "@/lib/settings";
import type { SpeedUnit } from "@/types/protocol";

export function money(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
}

/** A signed amount, such as +$250 or -$40. */
export function delta(value: number, locale: string): string {
  return (value >= 0 ? "+" : "-") + money(Math.abs(value), locale);
}

export function speed(metersPerSecond: number, unit: SpeedUnit): number {
  return Math.round(metersPerSecond * SPEED_FACTOR[unit]);
}

export function clock(hours: number, minutes: number, use24: boolean): string {
  const mm = String(minutes).padStart(2, "0");

  if (use24) {
    return `${String(hours).padStart(2, "0")}:${mm}`;
  }

  const suffix = hours >= 12 ? "PM" : "AM";

  return `${hours % 12 === 0 ? 12 : hours % 12}:${mm} ${suffix}`;
}

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function direction(heading: number): string {
  return DIRECTIONS[Math.round(heading / 45) % 8] ?? "N";
}

/** Gear text: R for reverse, N when stopped in first. */
export function gear(value: number, speedMs: number): string {
  if (value === 0) {
    return "R";
  }

  return speedMs < 0.5 && value === 1 ? "N" : String(value);
}
