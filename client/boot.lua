--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- Last client script: waits for the server config and ug-core, then binds keys and starts sampling.

local Nui = UgHud.Internal.Nui
local Settings = UgHud.Internal.Settings
local Display = UgHud.Internal.Display
local Collect = UgHud.Internal.Collect
local Vehicle = UgHud.Internal.Vehicle
local Editor = UgHud.Internal.Editor
local Enums = UgHud.Enums

local STATE_KEY = 'ug-hud:Config'
local READY_TIMEOUT = 60000
local VEHICLE_MS = 100
local FOOT_MS = 250
local SLOW_MS = 1000
-- Talking shows within a tenth of a second, on foot too.
local VOICE_MS = 100

---@param name string
---@return table<string, string> labels by entry name
local function labelsOf(name)
    local labels = {}

    if not UgCore.Modules.IsEnabled(name) then
        return labels
    end

    local ok, entries = pcall(UgCore.Config.Get, name, name)

    for key, entry in pairs(ok and type(entries) == 'table' and entries or {}) do
        if type(key) == 'string' and type(entry) == 'table' and type(entry.label) == 'string' then
            labels[key] = entry.label
        end
    end

    return labels
end

---@param settings table the owner config
---@return table
local function pageConfig(settings)
    local libConfig = GlobalState[UgLib.Enums.GlobalState.Config]

    return {
        theme = Nui.Theme(type(libConfig) == 'table' and libConfig.theme or nil, settings.theme),
        labels = Nui.Labels(),
        locale = UgLib.Locale.GetCode(),
        owner = {
            preset = settings.preset,
            speedUnit = settings.speedUnit,
            minimap = settings.minimap,
            accounts = settings.accounts,
            fuel = settings.fuel.source ~= Enums.FuelSource.None,
            seatbelt = settings.seatbelt.enabled,
            cruise = settings.cruise.enabled,
            voice = settings.voice ~= Enums.Voice.None,
            editorKey = UgLib.Keybind.GetKey('editor') or settings.editorKey,
            look = {
                defaults = settings.defaults,
                widgets = settings.widgets,
                cinematicWidgets = settings.cinematicWidgets,
                statusColors = settings.statusColors,
                alerts = settings.alerts,
                editor = settings.editor,
            },
        },
        accounts = labelsOf('accounts'),
        needs = labelsOf('needs'),
        settings = Settings.Get(),
    }
end

---@param settings table the owner config
local function bind(settings)
    local label = UgLib.Locale.Create()

    Editor.SetEnabled(settings.editor.enabled)

    if settings.editor.enabled then
        UgLib.Keybind.Register({
            name = 'editor',
            label = label('keybind.editor'),
            defaultKey = settings.editorKey,
            onPressed = Editor.Open,
        })
        RegisterCommand(settings.editorCommand, function()
            Editor.Open()
        end, false)
    end

    if settings.seatbelt.enabled then
        UgLib.Keybind.Register({
            name = 'seatbelt',
            label = label('keybind.seatbelt'),
            defaultKey = settings.seatbelt.key,
            onPressed = Vehicle.ToggleSeatbelt,
        })
    end

    if settings.cruise.enabled then
        UgLib.Keybind.Register({
            name = 'cruise',
            label = label('keybind.cruise'),
            defaultKey = settings.cruise.key,
            onPressed = Vehicle.ToggleCruise,
        })
    end
end

---@type table<string, boolean> collectors that already logged a failure
local failed = {}

---Runs one collector. A failing collector logs once and never stops the others: one error used to end the
---whole sampling thread, so the HUD froze on its first sample and widgets sampled later never filled.
---@param name string
---@param fn function
---@param ... any
---@return boolean ok
---@return any result
local function guard(name, fn, ...)
    local ok, result = pcall(fn, ...)

    if not ok and not failed[name] then
        failed[name] = true
        print(('^1[ug-hud] Reading %s failed: %s^7'):format(name, tostring(result)))
    end

    return ok, result
end

---@param settings table the owner config
local function run(settings)
    CreateThread(function()
        while true do
            if settings.hideGameHud then
                Display.HideGameHud()
            end

            Vehicle.Frame()
            Wait(0)
        end
    end)

    CreateThread(function()
        local slowAt = 0

        while true do
            local _, inVehicle = guard('vehicle', Vehicle.Sample, settings)

            inVehicle = inVehicle == true
            Display.Update(settings, inVehicle)

            if Display.IsVisible() then
                guard('player', Collect.Player)
                guard('weapon', Collect.Weapon)
                guard('location', Collect.Location)

                if GetGameTimer() >= slowAt then
                    slowAt = GetGameTimer() + SLOW_MS
                    guard('identity', Collect.Identity)
                    guard('needs', Collect.Needs)
                    guard('money', Collect.Money)
                end
            end

            Wait(inVehicle and VEHICLE_MS or FOOT_MS)
        end
    end)

    CreateThread(function()
        while true do
            if Display.IsVisible() then
                guard('voice', Collect.Voice, settings)
            end

            Wait(VOICE_MS)
        end
    end)
end

CreateThread(function()
    local deadline = GetGameTimer() + READY_TIMEOUT

    while type(GlobalState[STATE_KEY]) ~= 'table' do
        if GetGameTimer() >= deadline then
            print('^1[ug-hud] No config from the server. Check the server console.^7')

            return
        end

        Wait(250)
    end

    if not UgCore.Lifecycle.Await(UgCore.Enums.Lifecycle.Ready, READY_TIMEOUT) then
        print('^1[ug-hud] ug-core did not become ready.^7')

        return
    end

    local settings = GlobalState[STATE_KEY] --[[@as table]]

    Settings.Load()
    bind(settings)
    Nui.Configure(function()
        return pageConfig(settings)
    end)
    Display.PlaceMinimap(settings.minimapLift)
    Collect.Listen()
    Collect.Statuses()
    run(settings)

    if settings.editor.enabled then
        print(('[ug-hud] Ready: %s, /%s to customize.'):format(settings.preset, settings.editorCommand))
    else
        print(('[ug-hud] Ready: %s, editor off.'):format(settings.preset))
    end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        DisplayRadar(true)
        Display.ResetMinimap()
    end
end)
