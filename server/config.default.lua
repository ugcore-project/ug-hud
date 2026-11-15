--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- ug-hud config. Copied to config.lua in the resource folder on the first start: edit that file, never this one.
-- Updates never overwrite config.lua. A key you remove uses its default.
-- These are the defaults for new players. Each player MAY change the layout, styles, colors and units in game.

return {
    -- Key and command that open the HUD editor. Players MAY change the key in the game's key bindings.
    editorKey = 'I',
    editorCommand = 'hud',

    -- Look new players start with: 'neon', 'minimal', 'classic' or 'sport'.
    preset = 'neon',

    -- Speed unit new players start with: 'kmh' or 'mph'.
    speedUnit = 'kmh',

    -- When the minimap shows for new players: 'always', 'vehicle' or 'never'.
    minimap = 'vehicle',

    -- How far the minimap rises from the bottom, as a share of the screen height. The status widget sits under it
    -- and the voice widget above it. 0 keeps the game position.
    minimapLift = 0.09,

    -- ug-core accounts the money widget shows, in order.
    accounts = { 'cash', 'bank' },

    -- Hides the game's own HUD parts that ug-hud replaces: cash, vehicle and street names, weapon icon.
    hideGameHud = true,

    -- Voice: 'auto' shows pma-voice modes when it runs, and talking always. 'none' hides voice.
    voice = 'auto',

    -- Fuel: { source = 'native' } reads GetVehicleFuelLevel.
    -- { source = 'statebag', key = 'fuel' } reads an entity statebag, such as ox_fuel's.
    -- { source = 'export', resource = 'LegacyFuel', fn = 'GetFuel' } calls a client export with the vehicle.
    -- { source = 'none' } hides fuel.
    fuel = {
        source = 'native',
    },

    -- Seatbelt. Unbuckled players fly through the windscreen when a crash drops more than ejectDrop km/h
    -- at once, from above ejectSpeed km/h. Buckled players cannot leave the vehicle.
    seatbelt = {
        enabled = true,
        key = 'B',
        ejectSpeed = 60,
        ejectDrop = 25,
    },

    -- Cruise control holds the current speed. Braking turns it off.
    cruise = {
        enabled = true,
        key = 'Y',
    },

    -- ug-lib theme overrides for ug-hud only. Same fields as the ug-lib theme: mode, colors (HSL strings such as
    -- '262 83% 58%' keyed by ug-lib token), radius, font, scale. Left out, ug-lib's theme applies.
    theme = {},

    -- Starting look for new players and for "Reset". accent is a hex color, or '' for the preset's.
    -- scale: 0.6 to 1.6. cinematic: letterbox bars, only cinematicWidgets. smartHide: full bars hide until they change.
    -- effects: low health vignette and warning pulses. snap: editor snaps widgets to edges and centers.
    defaults = {
        accent = '',
        scale = 1.0,
        clock24 = true,
        cinematic = false,
        smartHide = false,
        effects = true,
        sounds = true,
        snap = true,
    },

    -- Every widget. enabled = false removes it for everyone. The rest is where new players start:
    -- x and y are the edge the widget hangs from, as a share of the screen (left half: left edge, right half: right edge,
    -- 0.5: centered). scale: 0.5 to 2. opacity: 0.2 to 1. style: '' for the preset's, or one the widget offers:
    -- status rings, bars, pills, minimal. money, identity, clock, weapon card, plain. voice pill, dots.
    -- speedometer arc, digital, bar. compass tape, heading.
    widgets = {
        status = {
            enabled = true,
            visible = true,
            x = 0.012,
            y = 0.975,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
        money = {
            enabled = true,
            visible = true,
            x = 0.988,
            y = 0.02,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
        identity = {
            enabled = true,
            visible = true,
            x = 0.988,
            y = 0.115,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
        voice = {
            enabled = true,
            visible = true,
            x = 0.012,
            y = 0.7,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
        speedometer = {
            enabled = true,
            visible = true,
            x = 0.988,
            y = 0.975,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
        compass = {
            enabled = true,
            visible = true,
            x = 0.5,
            y = 0.015,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
        clock = {
            enabled = true,
            visible = true,
            x = 0.012,
            y = 0.02,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
        weapon = {
            enabled = true,
            visible = true,
            x = 0.988,
            y = 0.2,
            scale = 1.0,
            opacity = 1.0,
            style = '',
        },
    },

    -- Widgets that stay on screen in cinematic mode.
    cinematicWidgets = { 'status', 'speedometer' },

    -- Bar colors (hex) before players pick their own. Needs and statuses from other resources MAY be added by name.
    statusColors = {
        health = '#ef4444',
        armor = '#3b82f6',
        stamina = '#22c55e',
        oxygen = '#67e8f9',
        hunger = '#f59e0b',
        thirst = '#06b6d4',
        stress = '#a855f7',
    },

    -- Warnings. lowHealth: health at or below shows the vignette and heartbeat. Bars pulse at or below lowStatus,
    -- or at or above highStatus for the inverted ones, where more is worse. Intervals in ms.
    -- chimeSpeed: unbuckled above this km/h chimes.
    alerts = {
        lowHealth = 30,
        lowStatus = 20,
        highStatus = 80,
        inverted = { 'stress' },
        heartbeatInterval = 1100,
        chimeInterval = 2000,
        chimeSpeed = 18,
    },

    -- What players MAY change. enabled = false removes the editor, its key and its command: everyone keeps the
    -- defaults above. presets and accents: the choices offered (preset MUST be one of presets). move: position, size
    -- and opacity. styles: presets and widget styles. colors: accent and bar colors. codes: share and import layouts.
    editor = {
        enabled = true,
        presets = { 'neon', 'minimal', 'classic', 'sport' },
        accents = { '#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#e5e7eb' },
        move = true,
        styles = true,
        colors = true,
        codes = true,
    },
}
