/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { Fuel, Gauge, Lightbulb, Mountain, ShieldCheck, ShieldOff, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import { gear, speed } from "@/lib/format";
import { SpeedUnit, VehicleKind, type VehicleData } from "@/types/protocol";

interface SpeedometerProps {
  vehicle: VehicleData;
  unit: SpeedUnit;
  style: string;
  /** Owner switches: a feature that is off shows nothing. */
  fuel: boolean;
  effects: boolean;
}

/** Top of the dial, per unit. */
const MAX_SPEED: Record<SpeedUnit, number> = { [SpeedUnit.Kmh]: 280, [SpeedUnit.Mph]: 180 };
const START = 135;
const SWEEP = 270;
const REDLINE = 0.85;

function point(cx: number, cy: number, r: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;

  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = point(cx, cy, r, from);
  const [x2, y2] = point(cx, cy, r, to);

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** Seatbelt, cruise, engine, lights and fuel. */
function Indicators({ vehicle, fuel, effects, moving }: { vehicle: VehicleData; fuel: boolean; effects: boolean; moving: boolean }) {
  const lowFuel = vehicle.fuel !== undefined && vehicle.fuel <= 15;

  return (
    <div className="flex items-center justify-center gap-2.5">
      {vehicle.seatbelt !== undefined && (
        <span data-indicator="seatbelt" data-on={vehicle.seatbelt}>
          {vehicle.seatbelt ? (
            <ShieldCheck className="h-4 w-4 text-success" strokeWidth={2.5} />
          ) : (
            <ShieldOff className={cn("h-4 w-4 text-destructive", effects && moving && "ug-hud-blink")} strokeWidth={2.5} />
          )}
        </span>
      )}
      {vehicle.cruise !== undefined && (
        <Gauge data-indicator="cruise" className={cn("h-4 w-4", vehicle.cruise ? "text-[var(--hud-accent)]" : "text-white/25")} strokeWidth={2.5} />
      )}
      <Wrench
        data-indicator="engine"
        className={cn("h-4 w-4", vehicle.engine <= 30 ? "text-destructive" : vehicle.engine <= 60 ? "text-warning" : "text-white/25")}
        strokeWidth={2.5}
      />
      <Lightbulb
        data-indicator="lights"
        className={cn("h-4 w-4", vehicle.lights === 2 ? "text-primary" : vehicle.lights === 1 ? "text-success" : "text-white/25")}
        strokeWidth={2.5}
      />
      {fuel && vehicle.fuel !== undefined && (
        <span className="flex items-center gap-1" data-indicator="fuel">
          <Fuel className={cn("h-4 w-4", lowFuel ? "text-destructive" : "text-white/70", lowFuel && effects && "ug-hud-pulse")} strokeWidth={2.5} />
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/15">
            <span className={cn("block h-full rounded-full", lowFuel ? "bg-destructive" : "bg-[var(--hud-accent)]")} style={{ width: `${vehicle.fuel}%` }} />
          </span>
        </span>
      )}
    </div>
  );
}

/** Gear, or altitude in the air. */
function Extra({ vehicle }: { vehicle: VehicleData }) {
  if (vehicle.kind === VehicleKind.Air) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold tabular-nums text-white/80">
        <Mountain className="h-3.5 w-3.5" strokeWidth={2.5} />
        {Math.round(vehicle.altitude ?? 0)}
      </span>
    );
  }

  if (vehicle.kind === VehicleKind.Boat) {
    return null;
  }

  return <span className="text-sm font-black text-[var(--hud-accent)]">{gear(vehicle.gear, vehicle.speed)}</span>;
}

function Arc({ vehicle, unit, fuel, effects }: Omit<SpeedometerProps, "style">) {
  const value = speed(vehicle.speed, unit);
  const ratio = Math.min(value / MAX_SPEED[unit], 1);
  const rpmRatio = vehicle.rpm;
  const needle = START + SWEEP * ratio;
  const ticks = [];

  for (let step = 0; step <= 14; step++) {
    const degrees = START + (SWEEP * step) / 14;
    const [x1, y1] = point(100, 100, 84, degrees);
    const [x2, y2] = point(100, 100, step % 2 === 0 ? 74 : 79, degrees);

    ticks.push(<line key={step} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(255 255 255 / 0.35)" strokeWidth={step % 2 === 0 ? 2 : 1} />);
  }

  return (
    <div className="relative w-52">
      <svg viewBox="0 0 200 175" className="w-full">
        <defs>
          <linearGradient id="ug-hud-speed" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--hud-accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--hud-accent)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="rgb(0 0 0 / 0.5)" />
        <path d={arc(100, 100, 88, START, START + SWEEP)} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="6" strokeLinecap="round" />
        {ratio > 0.005 && (
          <path
            d={arc(100, 100, 88, START, needle)}
            fill="none"
            stroke="url(#ug-hud-speed)"
            strokeWidth="6"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 6px var(--hud-accent))" }}
          />
        )}
        {ticks}
        <path d={arc(100, 100, 66, START, START + SWEEP)} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth="3" />
        <path d={arc(100, 100, 66, START + SWEEP * REDLINE, START + SWEEP)} fill="none" stroke="rgb(239 68 68 / 0.5)" strokeWidth="3" />
        {rpmRatio > 0.01 && (
          <path
            d={arc(100, 100, 66, START, START + SWEEP * rpmRatio)}
            fill="none"
            stroke={rpmRatio >= REDLINE ? "#ef4444" : "rgb(255 255 255 / 0.75)"}
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
        <g style={{ transform: `rotate(${needle}deg)`, transformOrigin: "100px 100px", transition: "transform 120ms linear" }}>
          <line x1="100" y1="100" x2="182" y2="100" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px #ef4444)" }} />
        </g>
        <circle cx="100" cy="100" r="5" fill="#111" stroke="#ef4444" strokeWidth="2" />
      </svg>
      <div className="absolute inset-x-0 top-[58%] flex flex-col items-center text-white">
        <span className="text-4xl font-black leading-none tabular-nums ug-hud-shadow" data-speed={value}>
          {value}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
          {unit === SpeedUnit.Kmh ? "km/h" : "mph"}
          <Extra vehicle={vehicle} />
        </span>
      </div>
      <div className="-mt-3">
        <Indicators vehicle={vehicle} fuel={fuel} effects={effects} moving={vehicle.speed > 2} />
      </div>
    </div>
  );
}

function Digital({ vehicle, unit, fuel, effects }: Omit<SpeedometerProps, "style">) {
  const value = speed(vehicle.speed, unit);

  return (
    <div className="flex flex-col items-end gap-1.5 text-white">
      <div className="flex items-end gap-2">
        <Extra vehicle={vehicle} />
        <span className="text-5xl font-black italic leading-none tabular-nums ug-hud-shadow" data-speed={value}>
          {String(value).padStart(3, "0")}
        </span>
        <span className="pb-1 text-xs font-bold uppercase text-white/60">{unit === SpeedUnit.Kmh ? "km/h" : "mph"}</span>
      </div>
      <div className="flex h-1.5 w-48 gap-0.5">
        {Array.from({ length: 20 }, (_, index) => (
          <span
            key={index}
            className="flex-1 rounded-sm"
            style={{ background: index / 20 < vehicle.rpm ? (index >= 17 ? "#ef4444" : "var(--hud-accent)") : "rgb(255 255 255 / 0.12)" }}
          />
        ))}
      </div>
      <Indicators vehicle={vehicle} fuel={fuel} effects={effects} moving={vehicle.speed > 2} />
    </div>
  );
}

function Bar({ vehicle, unit, fuel, effects }: Omit<SpeedometerProps, "style">) {
  const value = speed(vehicle.speed, unit);

  return (
    <div className="flex w-60 flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/55 p-3 text-white shadow-ug-lg backdrop-blur-md">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-black tabular-nums" data-speed={value}>
          {value}
          <span className="ml-1 text-xs font-bold uppercase text-white/50">{unit === SpeedUnit.Kmh ? "km/h" : "mph"}</span>
        </span>
        <Extra vehicle={vehicle} />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(value / MAX_SPEED[unit], 1) * 100}%`,
            background: "linear-gradient(90deg, transparent, var(--hud-accent))",
            transition: "width 120ms linear",
          }}
        />
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", vehicle.rpm >= REDLINE ? "bg-destructive" : "bg-white/70")} style={{ width: `${vehicle.rpm * 100}%` }} />
      </div>
      <Indicators vehicle={vehicle} fuel={fuel} effects={effects} moving={vehicle.speed > 2} />
    </div>
  );
}

export function Speedometer({ style, ...props }: SpeedometerProps) {
  if (style === "digital") return <Digital {...props} />;
  if (style === "bar") return <Bar {...props} />;

  return <Arc {...props} />;
}
