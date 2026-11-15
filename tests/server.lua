--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

local H = dofile('tests/helpers.lua')

---@param content string? config.lua content, nil for a first start
---@return string[] lines
local function boot(content)
    H.Reset()

    if content then
        H.Files['config.lua'] = content
    end

    return H.Load('server')
end

print('server')

H.Test('first start copies the example and publishes the defaults', function()
    local lines = boot(nil)

    H.ExpectLine(lines, '[ug-hud] v1.0.0 ready.')
    H.Equal(H.Saved['config.lua'], LoadResourceFile('ug-hud', 'server/config.default.lua'))
    H.Equal(GlobalState['ug-hud:Config'], H.Defaults())
end)

H.Test('owner values replace defaults key by key', function()
    boot("return { preset = 'sport', speedUnit = 'mph', fuel = { source = 'statebag', key = 'fuel' } }")

    local config = GlobalState['ug-hud:Config']

    H.Equal(config.preset, 'sport')
    H.Equal(config.speedUnit, 'mph')
    H.Equal(config.fuel, {
        source = 'statebag',
        key = 'fuel',
    })
    H.Equal(config.editorKey, 'I')
end)

H.Test('every bad value is reported and nothing is published', function()
    local lines = boot([[
        return {
            preset = 'rainbow',
            preseet = 'neon',
            seatbelt = { enabled = true, key = 'B', ejectSpeed = 1, ejectDrop = 25 },
            fuel = { source = 'export', resource = 'LegacyFuel' },
            accounts = { 'Cash Money' },
        }
    ]])

    H.ExpectLine(lines, 'preset:')
    H.ExpectLine(lines, 'unknown key "preseet". Did you mean "preset"?')
    H.ExpectLine(lines, 'seatbelt')
    H.ExpectLine(lines, 'fuel: source "export" MUST set resource and fn')
    H.ExpectLine(lines, 'accounts')
    H.ExpectLine(lines, 'Config invalid: 5 error(s).')
    H.Equal(GlobalState['ug-hud:Config'], nil)
end)

H.Test('a statebag fuel source needs a key', function()
    local lines = boot("return { fuel = { source = 'statebag' } }")

    H.ExpectLine(lines, 'fuel: source "statebag" MUST set key')
end)

H.Test('look tables merge onto the defaults, widgets one widget at a time', function()
    boot([[
        return {
            defaults = { accent = '#123456' },
            widgets = { clock = { x = 0.3, style = 'plain' } },
            statusColors = { drunk = '#facc15' },
            alerts = { lowHealth = 40 },
            editor = { codes = false },
            theme = { colors = { primary = '200 80% 50%' } },
        }
    ]])

    local config = GlobalState['ug-hud:Config']
    local defaults = H.Defaults()

    H.Equal(config.defaults.accent, '#123456')
    H.Equal(config.defaults.scale, 1.0)
    H.Equal(config.widgets.clock, {
        enabled = true,
        visible = true,
        x = 0.3,
        y = 0.02,
        scale = 1.0,
        opacity = 1.0,
        style = 'plain',
    })
    H.Equal(config.widgets.money, defaults.widgets.money)
    H.Equal(config.statusColors.drunk, '#facc15')
    H.Equal(config.statusColors.health, '#ef4444')
    H.Equal(config.alerts.lowHealth, 40)
    H.Equal(config.alerts.inverted, { 'stress' })
    H.Equal(config.editor.codes, false)
    H.Equal(config.editor.presets, defaults.editor.presets)
    H.Equal(config.theme, {
        colors = {
            primary = '200 80% 50%',
        },
    })
end)

H.Test('bad look values are reported: styles per widget, presets the editor allows, colors', function()
    local lines = boot([[
        return {
            widgets = { clock = { style = 'arc' }, compass = { scale = 5 } },
            defaults = { accent = 'purple' },
            statusColors = { health = 'red' },
            cinematicWidgets = { 'radar' },
            editor = { presets = { 'minimal' } },
            theme = { colors = { primary = '#ff0000' }, radius = 'big' },
        }
    ]])

    H.ExpectLine(lines, 'widgets')
    H.ExpectLine(lines, 'defaults')
    H.ExpectLine(lines, 'statusColors')
    H.ExpectLine(lines, 'cinematicWidgets')
    H.ExpectLine(lines, 'preset: "neon" MUST be one of editor.presets')
    H.ExpectLine(lines, 'theme')
    H.Equal(GlobalState['ug-hud:Config'], nil)
end)

H.Test('syntax errors and runtime errors are reported, the sandbox has no os', function()
    H.ExpectLine(boot('return {'), 'config.lua:')
    H.ExpectLine(boot('return os.exit()'), 'config.lua:')
    H.ExpectLine(boot('return 5'), 'MUST return a table')
end)

H.Done()
