/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Status icons by name. A fixed set keeps the bundle small. Unknown names get a dot.

import {
  Beer,
  Brain,
  CircleDot,
  Droplet,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Pill,
  Radiation,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Thermometer,
  Utensils,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  health: Heart,
  heart: Heart,
  armor: Shield,
  shield: Shield,
  stamina: Footprints,
  footprints: Footprints,
  oxygen: Waves,
  waves: Waves,
  hunger: Utensils,
  utensils: Utensils,
  thirst: Droplet,
  droplet: Droplet,
  droplets: Droplets,
  stress: Brain,
  brain: Brain,
  beer: Beer,
  drunk: Beer,
  flame: Flame,
  fire: Flame,
  pill: Pill,
  drugs: Pill,
  radiation: Radiation,
  skull: Skull,
  snowflake: Snowflake,
  cold: Snowflake,
  sparkles: Sparkles,
  thermometer: Thermometer,
  wind: Wind,
  zap: Zap,
  nitro: Zap,
};

/** The icon for a status or icon name, or a dot. Font Awesome style prefixes are ignored. */
export function iconFor(name: string | undefined): LucideIcon {
  if (!name) {
    return CircleDot;
  }

  const key = name.trim().toLowerCase().replace(/^fa-(solid|regular)\s+/, "").replace(/^fa-/, "");

  return ICONS[key] ?? CircleDot;
}
