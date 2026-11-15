/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import type { CSSProperties } from "react";
import { Mic, MicOff, Radio } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VoiceData } from "@/types/protocol";

interface VoiceProps {
  voice: VoiceData;
  labels: Record<string, string>;
  style: string;
}

const RADIO = "#34d399";
const LEVELS = [1, 2, 3];
// Talking color per proximity level: whisper, normal (the HUD accent), shouting.
const LEVEL_COLORS: Record<number, string> = { 1: "#38bdf8", 2: "var(--hud-accent)", 3: "#f97316" };

/** The color of the current proximity level. */
function levelColor(level: number): string {
  return LEVEL_COLORS[level] ?? "var(--hud-accent)";
}

/** Rings that grow out of an icon while its owner talks. */
function Ripple({ color }: { color: string }) {
  return (
    <>
      <span className="ug-hud-ripple absolute inset-0 rounded-full" style={{ borderColor: color }} />
      <span className="ug-hud-ripple absolute inset-0 rounded-full" style={{ borderColor: color, animationDelay: "0.6s" }} />
    </>
  );
}

/** Proximity as three rising bars: one for whisper, two for normal, three for shouting. They dance while talking. */
function Levels({ level, talking, size, color }: { level: number; talking: boolean; size: "sm" | "md"; color: string }) {
  return (
    <div className="flex items-end gap-[3px]" data-level={level}>
      {LEVELS.map((bar) => {
        const on = bar <= level;

        return (
          <span
            key={bar}
            data-on={on}
            className={cn("rounded-full transition-colors duration-150", size === "md" ? "w-[5px]" : "w-1", on && talking && "ug-hud-wave")}
            style={{
              height: (size === "md" ? 5 : 4) + bar * (size === "md" ? 4 : 3),
              background: on ? (talking ? color : "rgb(255 255 255 / 0.85)") : "rgb(255 255 255 / 0.18)",
              boxShadow: on && talking ? `0 0 8px ${color}` : undefined,
              animationDelay: `${bar * 110}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/** The radio channel. Glows and ripples while talking on it. */
function RadioChip({ voice, labels, compact }: { voice: VoiceData; labels: Record<string, string>; compact: boolean }) {
  const live = voice.radioTalking;

  return (
    <span
      data-radio={voice.radio}
      data-live={live}
      className={cn(
        "flex items-center gap-1.5 rounded-full font-bold transition-all duration-200",
        compact ? "text-[11px]" : "px-2 py-0.5 text-[11px]",
        !compact && (live ? "bg-success/20 ring-1 ring-success" : "bg-white/5 ring-1 ring-white/10"),
      )}
      style={{ color: RADIO, textShadow: live ? `0 0 8px ${RADIO}` : undefined } as CSSProperties}
    >
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        {live && <Ripple color={RADIO} />}
        <Radio className="relative h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
      {!compact && <span className="text-white/60">{labels["voice.radio"] ?? "Radio"}</span>}
      <span className="tabular-nums">{voice.radio}</span>
    </span>
  );
}

export function Voice({ voice, labels, style }: VoiceProps) {
  const Icon = voice.enabled ? Mic : MicOff;
  // Radio talk shows on the radio chip. The mic lights up for proximity only.
  const speaking = voice.talking && !voice.radioTalking;
  const level = voice.level ?? 2;
  const color = levelColor(level);
  const onRadio = voice.radio !== undefined;

  if (style === "dots") {
    return (
      <div className="flex items-center gap-2 text-white ug-hud-shadow" data-talking={speaking}>
        <span className="relative flex h-4 w-4 items-center justify-center">
          {speaking && <Ripple color={color} />}
          <Icon className={cn("relative h-4 w-4", !speaking && "text-white/75")} style={speaking ? { color } : undefined} strokeWidth={2.5} />
        </span>
        <Levels level={level} talking={speaking} size="sm" color={color} />
        {onRadio && <RadioChip voice={voice} labels={labels} compact />}
      </div>
    );
  }

  return (
    <div
      data-talking={speaking}
      className={cn(
        "flex items-center gap-2.5 rounded-full border bg-black/55 py-1 pl-1 pr-3 text-white shadow-ug-lg backdrop-blur-md transition-all duration-200",
        voice.radioTalking && !speaking ? "border-success" : !speaking && "border-white/10",
      )}
      style={{
        borderColor: speaking ? color : undefined,
        boxShadow: speaking ? `0 0 18px -4px ${color}` : voice.radioTalking ? `0 0 18px -4px ${RADIO}` : undefined,
      }}
    >
      <span
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200",
          !speaking && "bg-white/10",
        )}
        style={speaking ? { background: color } : undefined}
      >
        {speaking && <Ripple color={color} />}
        <Icon className={cn("relative h-3.5 w-3.5", speaking ? "text-black" : "text-white/80")} strokeWidth={2.5} />
      </span>
      <Levels level={level} talking={speaking} size="md" color={color} />
      {voice.mode && (
        <span
          data-mode-color={speaking ? level : undefined}
          className="text-xs font-semibold transition-colors duration-150"
          style={speaking ? { color, textShadow: `0 0 8px ${color}` } : undefined}
        >
          {voice.mode}
        </span>
      )}
      {onRadio && <RadioChip voice={voice} labels={labels} compact={false} />}
    </div>
  );
}
