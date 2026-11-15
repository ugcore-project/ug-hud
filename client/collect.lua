--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- Reads what the HUD shows and sends what changed. Needs and money arrive as ug-core events, the rest is sampled.
-- Everything here is display only: the server owns needs, money, jobs and death state.

---@class UgHud.Internal.Collect
local Collect = {}
UgHud.Internal.Collect = Collect

local Nui = UgHud.Internal.Nui
local Statuses = UgHud.Internal.Statuses
local Action = UgHud.Enums.NuiAction
local StateBags = UgCore.Enums.StateBags

local UNARMED = GetHashKey('WEAPON_UNARMED')
-- GetPlayerUnderwaterTimeRemaining starts at 10 s for players.
local OXYGEN_SECONDS = 10

---@param value number
---@return integer
local function percent(value)
    return math.floor(math.min(math.max(value, 0), 100) + 0.5)
end

---@param role any a job or gang statebag value
---@return table?
local function roleOf(role)
    if type(role) ~= 'table' or type(role.name) ~= 'string' then
        return nil
    end

    return {
        name = role.name,
        label = type(role.label) == 'string' and role.label or role.name,
        grade = type(role.gradeLabel) == 'string' and role.gradeLabel or nil,
        onDuty = role.onDuty == true,
    }
end

function Collect.Player()
    local ped = PlayerPedId()
    local player = PlayerId()
    local maxHealth = math.max(GetEntityMaxHealth(ped) - 100, 1)
    local underwater = IsPedSwimmingUnderWater(ped) == true

    Nui.SendIfChanged(Action.Player, {
        health = percent((GetEntityHealth(ped) - 100) / maxHealth * 100),
        armor = percent(GetPedArmour(ped)),
        stamina = percent(100 - GetPlayerSprintStaminaRemaining(player)),
        oxygen = underwater and percent(GetPlayerUnderwaterTimeRemaining(player) / OXYGEN_SECONDS * 100) or 100,
        underwater = underwater,
        deathState = UgCore.LocalPlayer.GetDeathState(),
    })
end

function Collect.Weapon()
    local ped = PlayerPedId()
    local _, weapon = GetCurrentPedWeapon(ped, true)

    if not weapon or weapon == UNARMED or GetWeaponClipSize(weapon) <= 0 then
        Nui.SendIfChanged(Action.Weapon, {
            armed = false,
        })

        return
    end

    local _, clip = GetAmmoInClip(ped, weapon)

    Nui.SendIfChanged(Action.Weapon, {
        armed = true,
        clip = clip or 0,
        total = GetAmmoInPedWeapon(ped, weapon),
    })
end

function Collect.Identity()
    local state = LocalPlayer.state

    Nui.SendIfChanged(Action.Identity, {
        id = GetPlayerServerId(PlayerId()),
        job = roleOf(state[StateBags.Job]),
        gang = roleOf(state[StateBags.Gang]),
    })
end

---Proximity level from 1 (quietest) to 3 (loudest). pma-voice's default modes are Whisper 1.5 m, Normal 3 m and
---Shouting 6 m, in that index order. Servers with other modes get their index, capped at 3.
---@param proximity table
---@return integer?
local function levelOf(proximity)
    local index = proximity.index

    if math.type(index) == 'integer' and index >= 1 then
        return math.min(index, 3)
    end

    local distance = proximity.distance

    if type(distance) ~= 'number' then
        return nil
    end

    return distance <= 2 and 1 or (distance <= 4 and 2 or 3)
end

---Voice from pma-voice: talking, proximity mode and radio. Read from its statebags, documented in its source:
---`proximity` { index, distance, mode }, `radioChannel` set by its server, `radioActive` while talking on radio.
---@param settings table the owner config
function Collect.Voice(settings)
    if settings.voice == UgHud.Enums.Voice.None then
        Nui.SendIfChanged(Action.Voice, {
            enabled = false,
        })

        return
    end

    local player = PlayerId()
    local pma = GetResourceState('pma-voice') == 'started'
    local state = LocalPlayer.state
    local proximity = pma and state.proximity or nil
    local radio = pma and tonumber(state.radioChannel) or nil
    local onRadio = radio ~= nil and radio > 0
    -- pma-voice talks through Mumble. Older builds answer 1 instead of true.
    local mumble = pma and MumbleIsPlayerTalking(player) or nil
    local talking = mumble == true or mumble == 1 or NetworkIsPlayerTalking(player) == true

    Nui.SendIfChanged(Action.Voice, {
        enabled = true,
        talking = talking,
        radioTalking = onRadio and state.radioActive == true,
        mode = type(proximity) == 'table' and type(proximity.mode) == 'string' and proximity.mode:sub(1, 24) or nil,
        level = type(proximity) == 'table' and levelOf(proximity) or nil,
        radio = onRadio and radio or nil,
    })
end

---Where the camera faces, 0 for north, clockwise.
---@return integer
local function heading()
    local rotation = GetGameplayCamRot(2)

    return math.floor((360 - rotation.z) % 360 + 0.5) % 360
end

function Collect.Location()
    local coords = GetEntityCoords(PlayerPedId())
    local streetHash, crossingHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
    local crossing = crossingHash ~= 0 and GetStreetNameFromHashKey(crossingHash) or nil

    Nui.SendIfChanged(Action.Location, {
        heading = heading(),
        street = GetStreetNameFromHashKey(streetHash),
        crossing = crossing ~= '' and crossing or nil,
        zone = GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z)),
        hours = GetClockHours(),
        minutes = GetClockMinutes(),
    })
end

function Collect.Needs()
    if not UgCore.Modules.IsEnabled('needs') then
        return
    end

    local values = UgCore.Needs.GetAll()

    if type(values) == 'table' then
        Nui.SendIfChanged(Action.Needs, values)
    end
end

function Collect.Money()
    if not UgCore.Modules.IsEnabled('accounts') then
        return
    end

    local values = UgCore.Accounts.GetAll()

    if type(values) == 'table' then
        Nui.SendIfChanged(Action.Money, values)
    end
end

function Collect.Statuses()
    Nui.Send(Action.Statuses, Statuses.Present())
end

---Needs and money push changes as they happen instead of waiting for a sample.
function Collect.Listen()
    UgCore.Lifecycle.On(UgCore.Enums.Lifecycle.Ready, function()
        if UgCore.Modules.IsEnabled('needs') then
            UgCore.Events.On(UgCore.Enums.Events.Needs.Changed, Collect.Needs)
        end

        if UgCore.Modules.IsEnabled('accounts') then
            UgCore.Events.On(UgCore.Enums.Events.Accounts.Changed, Collect.Money)
        end
    end)

    Statuses.OnChange(Collect.Statuses)
end
