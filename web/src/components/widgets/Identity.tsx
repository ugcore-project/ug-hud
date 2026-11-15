/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { Briefcase, Skull, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import type { IdentityData, Role } from "@/types/protocol";

interface IdentityProps {
  identity: IdentityData;
  labels: Record<string, string>;
  style: string;
}

function RoleLine({ role, icon: Icon, duty, color }: { role: Role; icon: typeof Briefcase; duty?: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("h-3.5 w-3.5", color)} strokeWidth={2.5} />
      <span className="text-xs font-semibold">{role.label}</span>
      {role.grade && <span className="text-[11px] text-white/55">· {role.grade}</span>}
      {duty !== undefined && (
        <span
          title={duty}
          className={cn("ml-0.5 h-1.5 w-1.5 rounded-full", role.onDuty ? "bg-success shadow-[0_0_6px_hsl(var(--ug-success))]" : "bg-white/30")}
        />
      )}
    </div>
  );
}

export function Identity({ identity, labels, style }: IdentityProps) {
  const card = style === "card";
  const gang = identity.gang && identity.gang.name !== "none" ? identity.gang : undefined;

  return (
    <div
      className={cn(
        "flex flex-col items-end gap-1 text-white",
        card ? "rounded-xl border border-white/10 bg-black/55 px-3 py-2 shadow-ug-lg backdrop-blur-md" : "ug-hud-shadow",
      )}
    >
      <div className="flex items-center gap-1.5">
        <UserRound className={cn("h-3.5 w-3.5", card ? "text-[var(--hud-accent)]" : "text-white/60")} strokeWidth={2.5} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{labels["identity.id"] ?? "ID"}</span>
        <span className="text-xs font-bold tabular-nums">{identity.id}</span>
      </div>
      {identity.job && (
        <RoleLine role={identity.job} icon={Briefcase} color={card ? "text-primary" : "text-[var(--hud-accent)]"} duty={identity.job.onDuty ? (labels["identity.onDuty"] ?? "On duty") : (labels["identity.offDuty"] ?? "Off duty")} />
      )}
      {gang && <RoleLine role={gang} icon={Skull} color={card ? "text-destructive" : "text-[var(--hud-accent)]"} />}
    </div>
  );
}
