--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- The player's HUD settings, saved on their PC in client KVP. The page owns the format and checks it on load.
-- Lua keeps it as an opaque, bounded JSON string and reads only what Lua needs: the minimap mode.

---@class UgHud.Internal.Settings
local Settings = {}
UgHud.Internal.Settings = Settings

local Minimap = UgHud.Enums.Minimap

local KVP_KEY = 'ug-hud:Settings'
-- Far more than a full layout needs, small enough for KVP.
local MAX_BYTES = 32768

---@type string?
local saved = nil
---@type UgHudMinimap?
local minimap = nil

---@param value any
---@return UgHudMinimap?
local function minimapOf(value)
    for _, mode in pairs(Minimap) do
        if value == mode then
            return mode
        end
    end

    return nil
end

---Checks a settings string from the page or KVP: bounded JSON with an object at the top.
---@param text any
---@return table? decoded nil when it is not acceptable
local function decode(text)
    if type(text) ~= 'string' or #text == 0 or #text > MAX_BYTES then
        return nil
    end

    local ok, value = pcall(json.decode, text)

    return ok and type(value) == 'table' and value or nil
end

function Settings.Load()
    local text = GetResourceKvpString(KVP_KEY)
    local decoded = decode(text)

    saved = decoded and text or nil
    minimap = decoded and minimapOf(decoded.minimap) or nil
end

---The saved settings string, nil before the player saved anything.
---@return string?
function Settings.Get()
    return saved
end

---The player's minimap mode, or the owner's default.
---@param default UgHudMinimap
---@return UgHudMinimap
function Settings.Minimap(default)
    return minimap or default
end

---Saves settings from the page.
---@param text any
---@return boolean ok
function Settings.Save(text)
    local decoded = decode(text)

    if not decoded then
        return false
    end

    ---@cast text string
    SetResourceKvp(KVP_KEY, text)
    saved = text
    minimap = minimapOf(decoded.minimap)

    return true
end

Settings.MaxBytes = MAX_BYTES
