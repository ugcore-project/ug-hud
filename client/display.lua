--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- When the HUD and the minimap show, and the game HUD parts ug-hud replaces.

---@class UgHud.Internal.Display
local Display = {}
UgHud.Internal.Display = Display

local Nui = UgHud.Internal.Nui
local Settings = UgHud.Internal.Settings
local Enums = UgHud.Enums

-- HUD component ids from the Cfx docs: weapon icon, cash, MP cash, vehicle name, area name, vehicle class, street name,
-- cash change.
local GAME_HUD = { 2, 3, 4, 6, 7, 8, 9, 13 }

---@type table<string, boolean> resources that asked to hide the HUD
local hiders = {}
local visible = false
local radar = nil
local editing = false

-- Game positions of the minimap parts, from common:/data/ui/frontend.xml. They are not in the Cfx docs: verify them on
-- a live server. posY is a screen offset from the bottom edge, so a smaller value sits higher.
local MINIMAP_PARTS = {
    {
        name = 'minimap',
        x = -0.0045,
        y = 0.002,
        width = 0.150,
        height = 0.188888,
    },
    {
        name = 'minimap_mask',
        x = 0.020,
        y = 0.032,
        width = 0.111,
        height = 0.159,
    },
    {
        name = 'minimap_blur',
        x = -0.03,
        y = 0.022,
        width = 0.266,
        height = 0.237,
    },
}

local WIDE = 16 / 9

---@type number how far the minimap is raised
local lift = 0
---@type number? width over height of the HUD page, which FiveM MAY keep at 16:9 on wider screens
local pageAspect = nil
---@type string? the placement last applied
local placed = nil

---The minimap reads its layout again when the big map toggles.
local function refresh()
    CreateThread(function()
        SetBigmapActive(true, false)
        Wait(0)
        SetBigmapActive(false, false)
    end)
end

---Puts the minimap parts where they belong. On screens wider than 16:9, the minimap keeps its 16:9 shape and moves
---into the area the HUD page covers, so it lines up with the widgets.
---Measured on a 21:9 screen, not in the Cfx docs: minimap x values and widths are stretched by the screen aspect over
---16:9. Verify on other screens.
local function place()
    local aspect = GetAspectRatio(false)
    local stretch = math.max(1.0, aspect / WIDE)
    -- Share of the screen width left and right of the HUD page.
    local margin = pageAspect and pageAspect < aspect and (1.0 - pageAspect / aspect) / 2 or 0.0
    local key = ('%.4f|%.4f|%.4f'):format(lift, stretch, margin)

    if key == placed then
        return
    end

    -- No lift on a 16:9 screen is the game layout: leave it untouched.
    if placed == nil and lift == 0 and stretch == 1.0 and margin == 0.0 then
        return
    end

    placed = key

    for _, part in ipairs(MINIMAP_PARTS) do
        local x = (margin + part.x / stretch) / stretch
        local width = part.width / (stretch * stretch)

        SetMinimapComponentPosition(part.name, 'L', 'B', x, part.y - lift, width, part.height)
    end

    refresh()
end

---Raises the minimap by a share of the screen height. 0 keeps the game height.
---@param value number
function Display.PlaceMinimap(value)
    lift = value
    place()
end

---The HUD page size, sent by the page when it loads and when it resizes.
---@param width number
---@param height number
function Display.SetViewport(width, height)
    pageAspect = width / height
    place()
end

---Puts the minimap back where the game has it.
function Display.ResetMinimap()
    if placed == nil then
        return
    end

    placed = nil

    for _, part in ipairs(MINIMAP_PARTS) do
        SetMinimapComponentPosition(part.name, 'L', 'B', part.x, part.y, part.width, part.height)
    end

    refresh()
end

-- Page sizes outside this range are not a real screen.
local MIN_SIDE, MAX_SIDE = 100, 20000

Nui.On(Enums.NuiCallback.Viewport, function(body)
    local width, height = body.width, body.height

    if type(width) ~= 'number' or type(height) ~= 'number' or width < MIN_SIDE or width > MAX_SIDE
        or height < MIN_SIDE or height > MAX_SIDE then
        return false
    end

    Display.SetViewport(width, height)

    return true
end)

---@param value boolean
function Display.SetEditing(value)
    editing = value
end

---@return boolean
function Display.IsVisible()
    return visible
end

---@param settings table the owner config
---@param inVehicle boolean
function Display.Update(settings, inVehicle)
    local loaded = LocalPlayer.state[UgCore.Enums.StateBags.Loaded] == true
    local show = editing or (loaded and next(hiders) == nil and not IsPauseMenuActive() and not IsScreenFadedOut())

    if show ~= visible then
        visible = show
        Nui.Send(Enums.NuiAction.Visible, {
            visible = show,
        })
    end

    local mode = Settings.Minimap(settings.minimap)
    local wantRadar = show and (mode == Enums.Minimap.Always or (mode == Enums.Minimap.Vehicle and inVehicle))

    if wantRadar ~= radar then
        radar = wantRadar
        DisplayRadar(wantRadar)
    end
end

---Hides the game HUD parts that ug-hud replaces. MUST run every frame.
function Display.HideGameHud()
    if visible then
        for _, component in ipairs(GAME_HUD) do
            HideHudComponentThisFrame(component)
        end
    end
end

---@param resource string
---@param hidden boolean
function Display.SetHidden(resource, hidden)
    hiders[resource] = hidden == true or nil
end

exports('SetHidden', function(hidden)
    Display.SetHidden(GetInvokingResource() or GetCurrentResourceName(), hidden == true)
end)

exports('IsVisible', function()
    return visible
end)

AddEventHandler('onClientResourceStop', function(resource)
    hiders[resource] = nil
end)
