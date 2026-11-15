--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

local H = dofile('tests/helpers.lua')

---@param path string
---@return string
local function read(path)
    return assert(LoadResourceFile('ug-hud', path), 'missing ' .. path)
end

---Values of `export const <name> = { Key: "value", ... }` in protocol.ts.
---@param source string
---@param name string
---@return table<string, string>
local function tsEnum(source, name)
    local body = assert(source:match('export const ' .. name .. ' = (%b{})'), 'no enum ' .. name)
    local values = {}

    for key, value in body:gmatch('(%w+):%s*"([^"]+)"') do
        values[key] = value
    end

    return values
end

---Dotted keys of a decoded locale.
---@param group table
---@param prefix? string
---@param keys? table<string, boolean>
---@return table<string, boolean>
local function keysOf(group, prefix, keys)
    keys = keys or {}

    for key, value in pairs(group) do
        local path = (prefix or '') .. key

        if type(value) == 'table' then
            keysOf(value, path .. '.', keys)
        else
            keys[path] = true
        end
    end

    return keys
end

print('nui')

H.Test('page enums match shared/enums.lua', function()
    H.Reset()
    H.Load('server')

    local protocol = read('web/src/types/protocol.ts')

    for _, name in ipairs({ 'NuiAction', 'NuiCallback', 'Minimap', 'SpeedUnit', 'Preset', 'VehicleKind' }) do
        H.Equal(tsEnum(protocol, name), UgHud.Enums[name], name)
    end
end)

H.Test('widget styles match the page', function()
    H.Reset()
    H.Load('server')

    local settings = read('web/src/lib/settings.ts')
    local body = assert(settings:match('export const STYLES[^=]*= (%b{})'), 'no STYLES')
    local styles = {}

    for id, list in body:gmatch('(%w+):%s*(%b[])') do
        styles[id] = {}

        for style in list:gmatch('"([^"]+)"') do
            styles[id][#styles[id] + 1] = style
        end
    end

    H.Equal(styles, UgHud.Enums.WidgetStyles)

    local widgets = {}

    for _, id in pairs(UgHud.Enums.Widget) do
        widgets[id] = true
    end

    for id in pairs(styles) do
        H.Assert(widgets[id], 'widget ' .. id)
    end
end)

H.Test('every locale has the same keys as English', function()
    local english = keysOf(json.decode(read('locales/en.json')))

    for _, code in ipairs({ 'pt' }) do
        H.Equal(keysOf(json.decode(read(('locales/%s.json'):format(code)))), english, code)
    end
end)

H.Test('the page gets the page group, English when the locale is broken', function()
    H.Reset()
    H.Files['locales/en.json'] = '{"page":{"x":"English"}}'
    H.LoadClient()
    UgLib.Locale.GetCode = function()
        return 'pt'
    end
    H.Files['locales/pt.json'] = '{"page":'

    H.Equal(UgHud.Internal.Nui.Labels(), {
        x = 'English',
    })

    H.Files['locales/pt.json'] = '{"page":{"x":"Português"}}'
    H.Equal(UgHud.Internal.Nui.Labels(), {
        x = 'Português',
    })
end)

H.Test('messages wait for the page, and a reload replays the last state', function()
    H.Reset()
    H.LoadClient()

    local Nui = UgHud.Internal.Nui

    Nui.Send('player', {
        health = 50,
    })
    H.Natives = {}
    H.PostNui('ready', {})

    local actions = {}

    for _, message in ipairs(H.PageMessages()) do
        actions[message.action] = true
    end

    H.Assert(actions.config and actions.player and actions.visible, 'replayed config and the last state')
    H.Equal(H.LastPage('player'), {
        health = 50,
    })
end)

H.Test('unchanged payloads are not sent again', function()
    H.Reset()
    H.LoadClient()

    local Nui = UgHud.Internal.Nui

    H.Assert(Nui.SendIfChanged('weapon', {
        armed = true,
        clip = 3,
    }))
    H.Assert(not Nui.SendIfChanged('weapon', {
        armed = true,
        clip = 3,
    }))
    H.Assert(Nui.SendIfChanged('weapon', {
        armed = true,
        clip = 2,
    }))
end)

H.Test('page callbacks are rate limited', function()
    H.Reset()
    H.LoadClient()
    UgHud.Internal.Editor.Open()

    local accepted = 0

    for _ = 1, 15 do
        if H.PostNui('save', {
            settings = '{}',
        }).ok then
            accepted = accepted + 1
        end
    end

    H.Equal(accepted, 10)
    H.Advance(1000)
    H.Assert(H.PostNui('save', {
        settings = '{}',
    }).ok, 'a new second has a new budget')
end)

H.Done()
