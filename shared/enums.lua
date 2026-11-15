--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

---@class UgHud.Enums
UgHud.Enums = {}

---When the minimap shows. MUST match web/src/types/protocol.ts.
---@enum UgHudMinimap
UgHud.Enums.Minimap = {
    Always = 'always',
    Vehicle = 'vehicle',
    Never = 'never',
}

---Starting looks. MUST match web/src/types/protocol.ts.
---@enum UgHudPreset
UgHud.Enums.Preset = {
    Neon = 'neon',
    Minimal = 'minimal',
    Classic = 'classic',
    Sport = 'sport',
}

---Speed units. MUST match web/src/types/protocol.ts.
---@enum UgHudSpeedUnit
UgHud.Enums.SpeedUnit = {
    Kmh = 'kmh',
    Mph = 'mph',
}

---HUD widgets. MUST match WIDGETS in web/src/lib/settings.ts.
---@enum UgHudWidget
UgHud.Enums.Widget = {
    Status = 'status',
    Money = 'money',
    Identity = 'identity',
    Voice = 'voice',
    Speedometer = 'speedometer',
    Compass = 'compass',
    Clock = 'clock',
    Weapon = 'weapon',
}

---Styles each widget offers. MUST match STYLES in web/src/lib/settings.ts.
---@type table<UgHudWidget, string[]>
UgHud.Enums.WidgetStyles = {
    status = { 'rings', 'bars', 'pills', 'minimal' },
    money = { 'card', 'plain' },
    identity = { 'card', 'plain' },
    voice = { 'pill', 'dots' },
    speedometer = { 'arc', 'digital', 'bar' },
    compass = { 'tape', 'heading' },
    clock = { 'card', 'plain' },
    weapon = { 'card', 'plain' },
}

---Where fuel comes from.
---@enum UgHudFuelSource
UgHud.Enums.FuelSource = {
    -- GetVehicleFuelLevel, which most fuel resources keep in sync.
    Native = 'native',
    -- An entity statebag, such as `fuel` from ox_fuel.
    StateBag = 'statebag',
    -- A client export of a fuel resource that takes the vehicle, such as LegacyFuel's GetFuel.
    Export = 'export',
    None = 'none',
}

---Where voice comes from.
---@enum UgHudVoice
UgHud.Enums.Voice = {
    -- pma-voice modes when it runs. Talking always shows.
    Auto = 'auto',
    None = 'none',
}

---What the vehicle is. MUST match web/src/types/protocol.ts.
---@enum UgHudVehicleKind
UgHud.Enums.VehicleKind = {
    Car = 'car',
    Bike = 'bike',
    Boat = 'boat',
    Air = 'air',
}

---Messages Lua sends to the page. MUST match web/src/types/protocol.ts.
---@enum UgHudNuiAction
UgHud.Enums.NuiAction = {
    Config = 'config',
    Visible = 'visible',
    Player = 'player',
    Needs = 'needs',
    Money = 'money',
    Identity = 'identity',
    Voice = 'voice',
    Vehicle = 'vehicle',
    Location = 'location',
    Weapon = 'weapon',
    Statuses = 'statuses',
    Editor = 'editor',
}

---Callbacks the page posts. MUST match web/src/types/protocol.ts.
---@enum UgHudNuiCallback
UgHud.Enums.NuiCallback = {
    Ready = 'ready',
    Save = 'save',
    Close = 'close',
    -- { width, height } of the page, on ready and on resize.
    Viewport = 'viewport',
}
