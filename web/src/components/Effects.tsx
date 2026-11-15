/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

// Screen effects and sounds: low health vignette and heartbeat, seatbelt chimes, cruise beep, cinematic bars.

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Alerts } from "@/lib/settings";
import { Sounds } from "@/lib/sound";
import type { PlayerData, VehicleData } from "@/types/protocol";

interface EffectsProps {
  player: PlayerData | null;
  vehicle: VehicleData | null;
  effects: boolean;
  sounds: boolean;
  cinematic: boolean;
  alerts: Alerts;
}

/** m/s to km/h. */
const KMH = 3.6;

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/** Plays `play` every `ms` while `active`. */
function useRepeat(active: boolean, ms: number, play: () => void): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    play();
    const timer = window.setInterval(play, ms);

    return () => window.clearInterval(timer);
  }, [active, ms, play]);
}

export function Effects({ player, vehicle, effects, sounds, cinematic, alerts }: EffectsProps) {
  const alive = player?.deathState === "Alive";
  const lowHealth = effects && alive && player !== null && player.health <= alerts.lowHealth;
  const intensity = lowHealth && player && alerts.lowHealth > 0 ? 1 - player.health / alerts.lowHealth : 0;
  const seatbelt = vehicle?.seatbelt;
  const cruise = vehicle?.cruise;
  const previousSeatbelt = usePrevious(seatbelt);
  const previousCruise = usePrevious(cruise);

  useRepeat(sounds && lowHealth, alerts.heartbeatInterval, Sounds.heartbeat);
  useRepeat(sounds && seatbelt === false && (vehicle?.speed ?? 0) * KMH > alerts.chimeSpeed, alerts.chimeInterval, Sounds.warning);

  useEffect(() => {
    if (!sounds || previousSeatbelt === undefined || seatbelt === undefined || previousSeatbelt === seatbelt) return;

    (seatbelt ? Sounds.buckle : Sounds.unbuckle)();
  }, [sounds, seatbelt, previousSeatbelt]);

  useEffect(() => {
    if (sounds && previousCruise !== undefined && cruise !== undefined && previousCruise !== cruise) Sounds.cruise();
  }, [sounds, cruise, previousCruise]);

  return (
    <>
      <AnimatePresence>
        {lowHealth && (
          <motion.div
            key="vignette"
            data-effect="vignette"
            className="pointer-events-none absolute inset-0 ug-hud-heartbeat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: `radial-gradient(ellipse at center, transparent ${55 - intensity * 20}%, rgb(185 28 28 / ${0.35 + intensity * 0.4}) 100%)` }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cinematic && (
          <>
            <motion.div
              key="top"
              data-effect="letterbox"
              className="pointer-events-none absolute inset-x-0 top-0 h-[10vh] bg-black"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              key="bottom"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[10vh] bg-black"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
