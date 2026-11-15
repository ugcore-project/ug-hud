--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- Owner config: config.lua, copied from server/config.default.lua on the first start and never overwritten.
-- Owner values replace the defaults key by key. Clients get every value through GlobalState.

---@class UgHud.Internal.Config
local Config = {}
UgHud.Internal.Config = Config

local Schema = UgCore.Schema
local Enums = UgHud.Enums

local RESOURCE = GetCurrentResourceName()
local OWNER_FILE = 'config.lua'
local DEFAULT_FILE = 'server/config.default.lua'
local STATE_KEY = 'ug-hud:Config'

---@param enum table<string, string>
---@return string[]
local function valuesOf(enum)
    local values = {}

    for _, value in pairs(enum) do
        values[#values + 1] = value
    end

    table.sort(values)

    return values
end

local KEY = Schema.String({
    min = 1,
    max = 16,
    pattern = '^[%w_]+$',
})
local NAME = Schema.String({
    min = 1,
    max = 64,
    pattern = '^[%w_%-%.]+$',
})
local HEX = Schema.String({
    min = 7,
    max = 7,
    pattern = '^#%x%x%x%x%x%x$',
})
local HSL = Schema.String({
    min = 5,
    max = 24,
    pattern = '^%d+%.?%d* %d+%.?%d*%% %d+%.?%d*%%$',
})
local STATUS_NAME = Schema.String({
    min = 1,
    max = 32,
    pattern = '^[%w_%-]+$',
})
local PRESETS = valuesOf(Enums.Preset)
local WIDGETS = valuesOf(Enums.Widget)

-- ug-lib's theme tokens.
local THEME_TOKENS = {
    'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground',
    'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'muted', 'mutedForeground',
    'accent', 'accentForeground', 'destructive', 'destructiveForeground', 'success', 'successForeground',
    'warning', 'warningForeground', 'border', 'input', 'ring',
}

---@param value string
---@return boolean ok
---@return string? message
local function size(value)
    if value:find('^%d*%.?%d+rem$') or value:find('^%d*%.?%d+px$') then
        return true, nil
    end

    return false, 'MUST be a size such as "0.75rem" or "12px"'
end

---@param value string
---@return boolean ok
---@return string? message
local function accent(value)
    if value == '' or value:find('^#%x%x%x%x%x%x$') then
        return true, nil
    end

    return false, 'MUST be a hex color such as "#8b5cf6", or ""'
end

---Widget rules, one per widget, so each style is checked against what that widget offers.
---@return table<string, UgSchemaRule>
local function widgetRules()
    local rules = {}

    for _, id in ipairs(WIDGETS) do
        local styles = { '' }

        for _, style in ipairs(Enums.WidgetStyles[id]) do
            styles[#styles + 1] = style
        end

        rules[id] = Schema.Object({
            enabled = Schema.Boolean(),
            visible = Schema.Boolean(),
            x = Schema.Number({
                min = 0,
                max = 1,
            }),
            y = Schema.Number({
                min = 0,
                max = 1,
            }),
            scale = Schema.Number({
                min = 0.5,
                max = 2,
            }),
            opacity = Schema.Number({
                min = 0.2,
                max = 1,
            }),
            style = Schema.Enum(styles),
        })
    end

    return rules
end

---@type { key: string, rule: UgSchemaRule }[]
local RULES = {
    {
        key = 'editorKey',
        rule = KEY,
    },
    {
        key = 'editorCommand',
        rule = Schema.String({
            min = 1,
            max = 32,
            pattern = '^[%w_]+$',
        }),
    },
    {
        key = 'preset',
        rule = Schema.Enum(valuesOf(Enums.Preset)),
    },
    {
        key = 'speedUnit',
        rule = Schema.Enum(valuesOf(Enums.SpeedUnit)),
    },
    {
        key = 'minimap',
        rule = Schema.Enum(valuesOf(Enums.Minimap)),
    },
    {
        key = 'minimapLift',
        rule = Schema.Number({
            min = 0,
            max = 0.5,
        }),
    },
    {
        key = 'accounts',
        rule = Schema.Array(Schema.String({
            min = 1,
            max = 32,
            pattern = '^%l[%w]*$',
        }), {
            max = 8,
        }),
    },
    {
        key = 'hideGameHud',
        rule = Schema.Boolean(),
    },
    {
        key = 'voice',
        rule = Schema.Enum(valuesOf(Enums.Voice)),
    },
    {
        key = 'fuel',
        rule = Schema.Object({
            source = Schema.Enum(valuesOf(Enums.FuelSource)),
            key = Schema.Optional(NAME),
            resource = Schema.Optional(NAME),
            fn = Schema.Optional(NAME),
        }),
    },
    {
        key = 'seatbelt',
        rule = Schema.Object({
            enabled = Schema.Boolean(),
            key = KEY,
            ejectSpeed = Schema.Number({
                min = 10,
                max = 500,
            }),
            ejectDrop = Schema.Number({
                min = 5,
                max = 500,
            }),
        }),
    },
    {
        key = 'cruise',
        rule = Schema.Object({
            enabled = Schema.Boolean(),
            key = KEY,
        }),
    },
    {
        key = 'theme',
        rule = Schema.Object({
            mode = Schema.Optional(Schema.Enum({ 'dark', 'light' })),
            colors = Schema.Optional(Schema.Map(Schema.Enum(THEME_TOKENS), HSL, {
                max = #THEME_TOKENS,
            })),
            radius = Schema.Optional(Schema.String({
                min = 3,
                max = 16,
                validate = size,
            })),
            font = Schema.Optional(Schema.Enum({ 'Inter' })),
            scale = Schema.Optional(Schema.Number({
                min = 0.75,
                max = 1.5,
            })),
        }),
    },
    {
        key = 'defaults',
        rule = Schema.Object({
            accent = Schema.String({
                max = 7,
                validate = accent,
            }),
            scale = Schema.Number({
                min = 0.6,
                max = 1.6,
            }),
            clock24 = Schema.Boolean(),
            cinematic = Schema.Boolean(),
            smartHide = Schema.Boolean(),
            effects = Schema.Boolean(),
            sounds = Schema.Boolean(),
            snap = Schema.Boolean(),
        }),
    },
    {
        key = 'widgets',
        rule = Schema.Object(widgetRules()),
    },
    {
        key = 'cinematicWidgets',
        rule = Schema.Array(Schema.Enum(WIDGETS), {
            max = #WIDGETS,
        }),
    },
    {
        key = 'statusColors',
        rule = Schema.Map(STATUS_NAME, HEX, {
            max = 48,
        }),
    },
    {
        key = 'alerts',
        rule = Schema.Object({
            lowHealth = Schema.Integer({
                min = 0,
                max = 100,
            }),
            lowStatus = Schema.Integer({
                min = 0,
                max = 100,
            }),
            highStatus = Schema.Integer({
                min = 0,
                max = 100,
            }),
            inverted = Schema.Array(STATUS_NAME, {
                max = 16,
            }),
            heartbeatInterval = Schema.Integer({
                min = 300,
                max = 10000,
            }),
            chimeInterval = Schema.Integer({
                min = 300,
                max = 10000,
            }),
            chimeSpeed = Schema.Number({
                min = 0,
                max = 500,
            }),
        }),
    },
    {
        key = 'editor',
        rule = Schema.Object({
            enabled = Schema.Boolean(),
            presets = Schema.Array(Schema.Enum(PRESETS), {
                min = 1,
                max = #PRESETS,
            }),
            accents = Schema.Array(HEX, {
                max = 24,
            }),
            move = Schema.Boolean(),
            styles = Schema.Boolean(),
            colors = Schema.Boolean(),
            codes = Schema.Boolean(),
        }),
    },
}

-- Tables that merge onto the defaults field by field. widgets merges one level deeper, per widget.
local MERGED = {
    defaults = true,
    widgets = true,
    statusColors = true,
    alerts = true,
    editor = true,
}

---Runs owner code in a sandbox with only what a config needs.
---@param content string
---@param name? string file name in errors, config.lua by default
---@return boolean ok
---@return table? values
---@return string? message
local function run(content, name)
    local env = {
        vector2 = vector2, vector3 = vector3, vector4 = vector4,
        vec2 = vec2, vec3 = vec3, vec4 = vec4,
        tonumber = tonumber, tostring = tostring, type = type, pairs = pairs, ipairs = ipairs,
        math = setmetatable({}, {
            __index = math,
        }),
        string = setmetatable({}, {
            __index = string,
        }),
        table = setmetatable({}, {
            __index = table,
        }),
    }

    local chunk, syntaxError = load(content, '@' .. (name or OWNER_FILE), 't', env)

    if not chunk then
        return false, nil, tostring(syntaxError)
    end

    local ok, result = pcall(chunk)

    if not ok then
        return false, nil, tostring(result)
    end

    if type(result) ~= 'table' then
        return false, nil, 'MUST return a table'
    end

    return true, result, nil
end

---A fresh copy of the defaults, read from server/config.default.lua: the only place they live.
---@return table
function UgHud.Internal.Defaults()
    local ok, values, message = run(LoadResourceFile(RESOURCE, DEFAULT_FILE) or '', DEFAULT_FILE)

    if not ok or not values then
        error(('[ug-hud] %s: %s'):format(DEFAULT_FILE, tostring(message)), 2)
    end

    return values
end

---Checks merged values. Returns clean copies of every valid key.
---@param values table
---@return table clean
---@return string[] errors
function Config.Validate(values)
    local errors, clean, known, names = {}, {}, {}, {}

    for _, entry in ipairs(RULES) do
        known[entry.key] = true
        names[#names + 1] = entry.key

        local ok, checked, detail = Schema.Check(entry.rule, values[entry.key])

        if ok then
            clean[entry.key] = checked
        else
            local text = (detail or 'is invalid'):gsub('^value:? ?', '')

            errors[#errors + 1] = ('%s: %s'):format(entry.key, text)
        end
    end

    for key in pairs(values) do
        if not known[key] then
            local suggestion = type(key) == 'string' and UgLib.String.Suggest(key, names) or nil

            errors[#errors + 1] = ('unknown key "%s".%s'):format(tostring(key), suggestion and (' Did you mean "%s"?'):format(suggestion) or '')
        end
    end

    local fuel = clean.fuel

    if fuel and fuel.source == Enums.FuelSource.StateBag and not fuel.key then
        errors[#errors + 1] = 'fuel: source "statebag" MUST set key'
    end

    if fuel and fuel.source == Enums.FuelSource.Export and not (fuel.resource and fuel.fn) then
        errors[#errors + 1] = 'fuel: source "export" MUST set resource and fn'
    end

    local editor = clean.editor

    if editor and clean.preset then
        local allowed = false

        for _, preset in ipairs(editor.presets) do
            allowed = allowed or preset == clean.preset
        end

        if not allowed then
            errors[#errors + 1] = ('preset: "%s" MUST be one of editor.presets'):format(clean.preset)
        end
    end

    table.sort(errors)

    return clean, errors
end

---@type table?
local current = nil

---Reads, merges and checks config.lua, generating it from the example when missing. Publishes the client values.
---@return boolean ok
---@return string[] errors
function Config.Load()
    local content = LoadResourceFile(RESOURCE, OWNER_FILE)

    if content == nil then
        local example = LoadResourceFile(RESOURCE, DEFAULT_FILE)

        if example and SaveResourceFile(RESOURCE, OWNER_FILE, example, -1) then
            UgCore.Logger.Info('Generated %s.', OWNER_FILE)
        end

        content = example
    end

    local values = UgHud.Internal.Defaults()

    if content then
        local ok, owner, message = run(content)

        if not ok or not owner then
            current = nil

            return false, { ('%s: %s'):format(OWNER_FILE, tostring(message)) }
        end

        for key, value in pairs(owner) do
            if MERGED[key] and type(value) == 'table' and type(values[key]) == 'table' then
                for field, fieldValue in pairs(value) do
                    local base = values[key][field]

                    if key == 'widgets' and type(fieldValue) == 'table' and type(base) == 'table' then
                        for name, setting in pairs(fieldValue) do
                            base[name] = setting
                        end
                    else
                        values[key][field] = fieldValue
                    end
                end
            else
                values[key] = value
            end
        end
    end

    local clean, errors = Config.Validate(values)

    for index, message in ipairs(errors) do
        errors[index] = ('%s: %s'):format(OWNER_FILE, message)
    end

    current = #errors == 0 and clean or nil

    if current then
        GlobalState:set(STATE_KEY, current, true)
    end

    return current ~= nil, errors
end

---The loaded config. Raises before a successful Load.
---@return table
function Config.Get()
    if not current then
        error('[ug-hud] Config.Get before a successful Config.Load', 2)
    end

    return current
end

Config.StateKey = STATE_KEY
