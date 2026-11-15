/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { MapPin, Navigation } from "lucide-react";
import { direction } from "@/lib/format";
import type { LocationData } from "@/types/protocol";

interface CompassProps {
  location: LocationData;
  style: string;
}

/** Tape width in px for 360 degrees, and the visible window. */
const PX_PER_DEGREE = 3;
const WINDOW = 300;
const MARKS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function Street({ location }: { location: LocationData }) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-white ug-hud-shadow">
      <MapPin className="h-3.5 w-3.5 text-[var(--hud-accent)]" strokeWidth={2.5} />
      <span className="text-sm font-bold">{location.street}</span>
      {location.crossing && <span className="text-xs font-semibold text-white/55">× {location.crossing}</span>}
      {location.zone && <span className="text-xs text-white/55">· {location.zone}</span>}
    </div>
  );
}

function Tape({ heading }: { heading: number }) {
  const ticks = [];

  // Three turns, so the window never runs out of tape at either end.
  for (let degrees = -360; degrees < 720; degrees += 15) {
    const normal = ((degrees % 360) + 360) % 360;
    const mark = normal % 45 === 0 ? MARKS[normal / 45] : undefined;

    ticks.push(
      <div key={degrees} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: (degrees + 360) * PX_PER_DEGREE }}>
        <span className={mark ? "h-2.5 w-0.5 bg-white" : "h-1.5 w-px bg-white/50"} />
        {mark && <span className={mark.length === 1 ? "text-sm font-black text-white" : "text-[10px] font-bold text-white/70"}>{mark}</span>}
      </div>,
    );
  }

  return (
    <div
      className="relative h-8 overflow-hidden"
      style={{ width: WINDOW, maskImage: "linear-gradient(90deg, transparent, black 25%, black 75%, transparent)" }}
    >
      <div
        className="absolute top-0"
        style={{ transform: `translateX(${WINDOW / 2 - (heading + 360) * PX_PER_DEGREE}px)`, transition: "transform 120ms linear" }}
      >
        {ticks}
      </div>
      <span className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-[var(--hud-accent)]" />
    </div>
  );
}

export function Compass({ location, style }: CompassProps) {
  if (style === "heading") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-2 text-white ug-hud-shadow">
          <Navigation className="h-4 w-4 text-[var(--hud-accent)]" style={{ transform: `rotate(${location.heading}deg)` }} strokeWidth={2.5} />
          <span className="text-xl font-black" data-direction={direction(location.heading)}>
            {direction(location.heading)}
          </span>
          <span className="text-xs font-semibold tabular-nums text-white/55">{Math.round(location.heading)}°</span>
        </div>
        <Street location={location} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Tape heading={location.heading} />
      <Street location={location} />
    </div>
  );
}
