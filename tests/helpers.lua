--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- Test helpers: a tiny runner, CfxLua mocks, and the real ug-core and ug-lib shared code this resource relies on.
-- ug-core and ug-lib are read from the UG_CORE and UG_LIB paths, siblings of this repository by default.

---@class TestHelpers
local H = {}

H.CorePath = os.getenv('UG_CORE') or '../ug-core'
H.LibPath = os.getenv('UG_LIB') or '../ug-lib'

local passed, failed = 0, 0
local rawType = type
local vectorKinds = setmetatable({}, {
    __mode = 'k',
})

---The CfxLua `type` names vectors.
---@param value any
---@return string
type = function(value)
    return rawType(value) == 'table' and vectorKinds[value] or rawType(value)
end

---@param kind string
---@param components table
---@return table
local function newVector(kind, components)
    vectorKinds[components] = kind

    return components
end

function vector2(x, y) return newVector('vector2', { x = x, y = y }) end

function vector3(x, y, z) return newVector('vector3', { x = x, y = y, z = z }) end

function vector4(x, y, z, w) return newVector('vector4', { x = x, y = y, z = z, w = w }) end

---@type table<string, string|false> file contents by path; false reads as missing
H.Files = {}
---@type table<string, string> files written by SaveResourceFile
H.Saved = {}
---@type table<string, { handler: function, restricted: boolean }>
H.Commands = {}
---@type table<string, function[]>
H.Handlers = {}
---@type table<string, function>
H.Exports = {}
---@type table<string, table> exports of other resources
H.Remote = {}
---@type string?
H.Invoking = nil
H.Now = 0
H.CoreReady = true
---@type table<string, string> client KVP
H.Kvp = {}
---@type table<string, boolean> enabled ug-core modules
H.Modules = {}
---@type table<string, number>
H.Needs = {}
---@type table<string, number>
H.Money = {}
---@type string
H.DeathState = 'Alive'
---@type table[] ug-lib keybinds registered
H.Keybinds = {}
---@type table<string, fun(body: any, cb: fun(reply: any))> NUI callbacks the client registered
H.NuiCallbacks = {}
---@type table<string, fun(...)> ug-core event handlers by name
H.CoreEvents = {}
---@type { class: integer, speed: number, driver: boolean, entity: integer }? the vehicle the player sits in
H.Vehicle = nil
---@type table<integer, boolean> controls that read as just pressed once
H.Pressed = {}

function GetCurrentResourceName()
    return 'ug-hud'
end

function GetInvokingResource()
    return H.Invoking
end

---@param _ string
---@param path string
---@return string?
function LoadResourceFile(_, path)
    if H.Files[path] ~= nil then
        return H.Files[path] or nil
    end

    local handle = io.open(path, 'rb')

    if not handle then
        return nil
    end

    local content = handle:read('a')

    handle:close()

    return content
end

function SaveResourceFile(_, path, content)
    H.Saved[path] = content
    H.Files[path] = content

    return true
end

function GetResourceMetadata(_, key)
    return key == 'version' and '1.0.0' or nil
end

---@type { thread: thread, wakeAt: integer }[] threads waiting in Wait
local sleeping = {}

---@param thread thread
local function resume(thread)
    local ok, result = coroutine.resume(thread)

    if not ok then
        error(debug.traceback(thread, tostring(result)), 0)
    end

    if coroutine.status(thread) == 'suspended' then
        sleeping[#sleeping + 1] = {
            thread = thread,
            wakeAt = H.Now + math.max(result or 0, 1),
        }
    end
end

---Like FiveM: the thread runs at once until its first Wait.
function CreateThread(fn)
    resume(coroutine.create(fn))
end

---Yields until H.Advance reaches the time. Outside a thread it only moves the clock.
---@param ms? integer
function Wait(ms)
    if coroutine.isyieldable() then
        coroutine.yield(ms or 0)
    else
        H.Now = H.Now + (ms or 0)
    end
end

---Runs frames of 16 ms until `ms` passed, waking threads whose time came.
---@param ms integer
function H.Advance(ms)
    local target = H.Now + ms

    repeat
        H.Now = math.min(H.Now + 16, target)

        local ready = {}

        for index = #sleeping, 1, -1 do
            if sleeping[index].wakeAt <= H.Now then
                ready[#ready + 1] = table.remove(sleeping, index)
            end
        end

        for index = #ready, 1, -1 do
            resume(ready[index].thread)
        end
    until H.Now >= target
end

---Calls of mocked natives, in order: `{ name, args }`.
---@type { name: string, args: any[] }[]
H.Natives = {}

---@param name string
---@return { name: string, args: any[] }[]
function H.CallsOf(name)
    local list = {}

    for _, call in ipairs(H.Natives) do
        if call.name == name then
            list[#list + 1] = call
        end
    end

    return list
end

---@param name string
---@param ... any
local function record(name, ...)
    H.Natives[#H.Natives + 1] = {
        name = name,
        args = { ... },
    }
end

---@type table<string, any> answers of auto-mocked natives
H.NativeReturns = {}

-- Any other PascalCase global is a native: recorded, answering H.NativeReturns[name] or nil.
setmetatable(_G, {
    __index = function(_, name)
        if rawType(name) == 'string' and name:find('^%u') then
            return function(...)
                record(name, ...)

                local value = H.NativeReturns[name]

                if rawType(value) == 'function' then
                    return value(...)
                end

                return value
            end
        end

        return nil
    end,
})

function GetGameTimer()
    return H.Now
end

function GetHashKey(name)
    return 'hash:' .. name
end

function RegisterCommand(name, handler, restricted)
    H.Commands[name] = {
        handler = handler,
        restricted = restricted,
    }
end

function AddEventHandler(name, handler)
    H.Handlers[name] = H.Handlers[name] or {}
    table.insert(H.Handlers[name], handler)
end

exports = setmetatable({}, {
    __call = function(_, name, fn)
        H.Exports[name] = fn
    end,
    __index = function(_, resource)
        return H.Remote[resource]
    end,
})

---Calls an export of this resource as another resource.
---@param name string
---@param resource? string the calling resource, `other` by default
---@param ... any
---@return ...
function H.Export(name, resource, ...)
    local fn = assert(H.Exports[name], 'export not registered: ' .. name)

    H.Invoking = resource or 'other'

    local results = table.pack(pcall(fn, ...))

    H.Invoking = nil

    if not results[1] then
        error(results[2], 0)
    end

    return table.unpack(results, 2, results.n)
end

---Runs every handler of a FiveM event, like the runtime.
---@param name string
function H.TriggerEvent(name, ...)
    for _, handler in ipairs(H.Handlers[name] or {}) do
        handler(...)
    end
end

-- Client natives with state. Every other native answers H.NativeReturns.

function GetResourceKvpString(key)
    return H.Kvp[key]
end

function SetResourceKvp(key, value)
    H.Kvp[key] = value
end

function PlayerPedId()
    return 1
end

function PlayerId()
    return 0
end

function IsPedInAnyVehicle()
    return H.Vehicle ~= nil
end

function GetVehiclePedIsIn()
    return H.Vehicle and H.Vehicle.entity or 0
end

function GetVehicleClass()
    return H.Vehicle and H.Vehicle.class or 0
end

function GetEntitySpeed()
    return H.Vehicle and H.Vehicle.speed or 0.0
end

function GetEntityVelocity()
    local speed = H.Vehicle and H.Vehicle.speed or 0.0

    return vector3(0.0, speed, 0.0)
end

function GetPedInVehicleSeat()
    return H.Vehicle and H.Vehicle.driver and 1 or 2
end

function DoesEntityExist()
    return true
end

function IsControlJustPressed(_, control)
    if H.Pressed[control] then
        H.Pressed[control] = nil

        return true
    end

    return false
end

function GetOffsetFromEntityInWorldCoords()
    return vector3(1.0, 2.0, 3.0)
end

function GetEntityCoords()
    return vector3(0.0, 0.0, 0.0)
end

function GetGameplayCamRot()
    return vector3(0.0, 0.0, 90.0)
end

function GetVehicleLightsState()
    return true, 1, 0
end

function RegisterNUICallback(name, handler)
    H.NuiCallbacks[name] = handler
end

---Posts to a NUI callback like the page does. Returns the reply.
---@param name string
---@param body any
---@return any
function H.PostNui(name, body)
    local reply = nil

    assert(H.NuiCallbacks[name], 'NUI callback not registered: ' .. name)(body, function(value)
        reply = value
    end)

    return reply
end

---Messages sent to the page, in order.
---@return { action: string, payload: any }[]
function H.PageMessages()
    local list = {}

    for _, call in ipairs(H.CallsOf('SendNUIMessage')) do
        list[#list + 1] = call.args[1]
    end

    return list
end

---The payload of the last page message with this action.
---@param action string
---@return any
function H.LastPage(action)
    local found = nil

    for _, message in ipairs(H.PageMessages()) do
        if message.action == action then
            found = message
        end
    end

    return found and found.payload
end

---Loads a Lua file into the global environment.
---@param path string
local function run(path)
    local chunk = assert(loadfile(path, 't'))

    chunk()
end

local function loadCore()
    for _, file in ipairs({
        'core/shared/init.lua',
        'core/shared/utils/init.lua',
        'core/shared/utils/table.lua',
        'core/shared/utils/string.lua',
        'core/shared/enums/init.lua',
        'core/shared/enums/lifecycle.lua',
        'core/shared/enums/violations.lua',
        'core/shared/enums/errors.lua',
        'core/shared/logger.lua',
        'core/shared/schema.lua',
        'core/shared/enums/events.lua',
        'core/shared/enums/hooks.lua',
        'core/shared/enums/statebags.lua',
        'modules/players/shared/enums.lua',
        'modules/accounts/shared/enums.lua',
        'modules/needs/shared/enums.lua',
    }) do
        run(H.CorePath .. '/' .. file)
    end

    UgCore.Logger.Debug = function() end
    UgCore.Lifecycle = {
        Await = function()
            return H.CoreReady
        end,
        On = function(_, handler)
            handler()
        end,
    }
    UgCore.Modules = {
        IsEnabled = function(name)
            return H.Modules[name] == true
        end,
    }
    UgCore.Events = {
        On = function(name, handler)
            H.CoreEvents[name] = handler
        end,
    }
    UgCore.Config = {
        Get = function(name)
            if name == 'needs' then
                return {
                    hunger = {
                        label = 'Hunger',
                    },
                    thirst = {
                        label = 'Thirst',
                    },
                }
            end

            return {
                cash = {
                    label = 'Cash',
                },
                bank = {
                    label = 'Bank',
                },
            }
        end,
    }
    UgCore.LocalPlayer = {
        GetDeathState = function()
            return H.DeathState
        end,
    }
    UgCore.Needs = {
        GetAll = function()
            return H.Needs
        end,
    }
    UgCore.Accounts = {
        GetAll = function()
            return H.Money
        end,
    }
end

local function loadLib()
    for _, file in ipairs({ 'shared/init.lua', 'shared/utils.lua', 'shared/string.lua', 'shared/table.lua' }) do
        run(H.LibPath .. '/' .. file)
    end
end

local function installClient()
    LocalPlayer = {
        state = {
            [UgCore.Enums.StateBags.Loaded] = true,
        },
    }
    UgLib.Enums = UgLib.Enums or {}
    UgLib.Enums.GlobalState = {
        Config = 'ug-lib:Config',
    }
    UgLib.Locale = {
        Create = function()
            return function(key)
                return 'label:' .. key
            end
        end,
        GetCode = function()
            return 'en'
        end,
    }
    UgLib.Keybind = {
        Register = function(options)
            H.Keybinds[#H.Keybinds + 1] = options

            return '+ug-hud-' .. options.name
        end,
        GetKey = function()
            return nil
        end,
    }
end

---Reads script lists from fxmanifest.lua.
---@return table<string, string[]>
local function readManifest()
    local lists = {
        shared = {},
        server = {},
        client = {},
    }
    local groups = {
        shared_script = 'shared', shared_scripts = 'shared',
        server_script = 'server', server_scripts = 'server',
        client_script = 'client', client_scripts = 'client',
    }
    local env = setmetatable({}, {
        __index = function(_, directive)
            return function(value)
                local group = groups[directive]

                if group then
                    for _, entry in ipairs(rawType(value) == 'table' and value or { value }) do
                        table.insert(lists[group], entry)
                    end
                end
            end
        end,
    })

    assert(loadfile('fxmanifest.lua', 't', env))()

    return lists
end

---Fresh mocks. Tests change them before H.Load. `config.lua` starts missing, whatever is on disk.
function H.Reset()
    H.Files, H.Saved = {
        ['config.lua'] = false,
    }, {}
    H.Commands, H.Handlers = {}, {}
    H.Exports, H.Remote, H.Invoking = {}, {}, nil
    H.Now, H.CoreReady = 1000, true
    H.Natives = {}
    -- A healthy player on foot.
    H.NativeReturns = {
        GetEntityHealth = 200, GetEntityMaxHealth = 200, GetPedArmour = 0,
        GetPlayerSprintStaminaRemaining = 0.0, GetPlayerUnderwaterTimeRemaining = 10.0, GetWeaponClipSize = 0,
        GetVehicleCurrentRpm = 0.2, GetVehicleCurrentGear = 1, GetVehicleFuelLevel = 50.0,
        GetVehicleEngineHealth = 1000.0, GetVehicleBodyHealth = 1000.0, GetEntityHeightAboveGround = 0.0,
        GetPlayerServerId = 7, IsPauseMenuActive = false, IsScreenFadedOut = false, IsNuiFocused = false,
        GetAspectRatio = 16 / 9,
    }
    H.Kvp, H.Modules, H.Needs, H.Money, H.DeathState = {}, {}, {}, {}, 'Alive'
    H.Keybinds, H.NuiCallbacks, H.CoreEvents = {}, {}, {}
    H.Vehicle, H.Pressed = nil, {}
    GlobalState = setmetatable({}, {
        __index = {
            set = function(self, key, value)
                rawset(self, key, value)
            end,
        },
    })
    sleeping = {}
    UgCore, UgLib, UgHud, LocalPlayer = nil, nil, nil, nil
end

---Loads ug-core and ug-lib, then this resource's shared and side scripts in manifest order.
---@param side 'server'|'client'
---@return string[] printed lines
function H.Load(side)
    return H.Capture(function()
        loadCore()
        loadLib()

        if side == 'client' then
            installClient()
        end

        local manifest = readManifest()

        for _, group in ipairs({ 'shared', side }) do
            for _, path in ipairs(manifest[group]) do
                if path:sub(1, 1) ~= '@' then
                    run(path)
                end
            end
        end
    end)
end

---The defaults, read from server/config.default.lua like the server reads them.
---@return table
function H.Defaults()
    local content = assert(LoadResourceFile('ug-hud', 'server/config.default.lua'))
    local env = setmetatable({}, {
        __index = _G,
    })

    return assert(load(content, '@server/config.default.lua', 't', env))()
end

---Loads the client with the server's config replicated, boots it and opens the page.
---@param overrides? table config values that replace the defaults
---@return string[] printed lines
function H.LoadClient(overrides)
    local values = H.Defaults()

    for key, value in pairs(overrides or {}) do
        values[key] = value
    end

    GlobalState['ug-hud:Config'] = values

    local lines = H.Load('client')

    H.PostNui('ready', {})

    return lines
end

---Runs `fn` and returns every printed line, without color codes.
---@param fn fun()
---@return string[]
function H.Capture(fn)
    local lines = {}
    local original = print

    print = function(...)
        local parts = {}

        for index = 1, select('#', ...) do
            parts[#parts + 1] = tostring((select(index, ...)))
        end

        lines[#lines + 1] = (table.concat(parts, ' '):gsub('%^%d', ''))
    end

    local ok, err = pcall(fn)

    print = original

    if not ok then
        error(err, 0)
    end

    return lines
end

---@param a any
---@param b any
---@return boolean
local function same(a, b)
    if rawType(a) ~= 'table' or rawType(b) ~= 'table' then
        return a == b
    end

    if vectorKinds[a] ~= vectorKinds[b] then
        return false
    end

    for key, value in pairs(a) do
        if not same(value, b[key]) then
            return false
        end
    end

    for key in pairs(b) do
        if a[key] == nil then
            return false
        end
    end

    return true
end

---@param value any
---@param depth? integer
---@return string
local function show(value, depth)
    depth = depth or 0

    if rawType(value) ~= 'table' then
        return rawType(value) == 'string' and ('%q'):format(value) or tostring(value)
    end

    if depth > 3 then
        return '{...}'
    end

    local parts = {}

    for key, item in pairs(value) do
        parts[#parts + 1] = ('%s = %s'):format(tostring(key), show(item, depth + 1))
    end

    table.sort(parts)

    return (vectorKinds[value] or '') .. '{ ' .. table.concat(parts, ', ') .. ' }'
end

function H.Equal(actual, expected, message)
    if not same(actual, expected) then
        error(('%s\n  expected: %s\n  actual:   %s'):format(message or 'not equal', show(expected), show(actual)), 2)
    end
end

function H.Assert(condition, message)
    if not condition then
        error(message or 'assertion failed', 2)
    end
end

---Runs `fn` and expects it to raise an error containing `text`.
---@param fn fun()
---@param text string
function H.Raises(fn, text)
    local ok, err = pcall(fn)

    if ok then
        error(('expected an error containing "%s"'):format(text), 2)
    end

    if not tostring(err):find(text, 1, true) then
        error(('expected an error containing "%s", got: %s'):format(text, tostring(err)), 2)
    end
end

---@param lines string[]
---@param text string
---@return boolean
function H.Contains(lines, text)
    for _, line in ipairs(lines) do
        if line:find(text, 1, true) then
            return true
        end
    end

    return false
end

---@param lines string[]
---@param text string
function H.ExpectLine(lines, text)
    if not H.Contains(lines, text) then
        error(('no line contains "%s":\n  %s'):format(text, table.concat(lines, '\n  ')), 2)
    end
end

---Wrong-type values for tests. LuaLS ignores casts on literals.
---@param value any
---@return any
function H.Any(value)
    return value
end

---@param name string
---@param fn fun()
function H.Test(name, fn)
    local ok, err = xpcall(fn, debug.traceback)

    if ok then
        passed = passed + 1
        print('  ok    ' .. name)
    else
        failed = failed + 1
        print('  FAIL  ' .. name .. '\n        ' .. tostring(err):gsub('\n', '\n        '))
    end
end

function H.Done()
    print(('\n%d passed, %d failed'):format(passed, failed))
    os.exit(failed == 0 and 0 or 1)
end

---Minimal json like the CfxLua one: objects, arrays, strings, numbers, booleans. Empty tables encode as `[]`.
json = {}

---@param value any
---@return string
function json.encode(value)
    local kind = type(value)

    if kind == 'nil' then
        return 'null'
    end

    if kind == 'boolean' then
        return tostring(value)
    end

    if kind == 'number' then
        return math.type(value) == 'integer' and tostring(value) or ('%.17g'):format(value)
    end

    if kind == 'string' then
        return '"' .. value:gsub('[%c"\\]', function(char)
            return ('\\u%04x'):format(char:byte())
        end) .. '"'
    end

    if kind ~= 'table' then
        error('cannot encode a ' .. kind, 2)
    end

    local count = 0

    for _ in pairs(value) do
        count = count + 1
    end

    local parts = {}

    if count == #value then
        for index = 1, #value do
            parts[index] = json.encode(value[index])
        end

        return '[' .. table.concat(parts, ',') .. ']'
    end

    local keys = {}

    for key in pairs(value) do
        keys[#keys + 1] = tostring(key)
    end

    table.sort(keys)

    for index, key in ipairs(keys) do
        local entry = value[key]

        if entry == nil then
            entry = value[tonumber(key)]
        end

        parts[index] = json.encode(key) .. ':' .. json.encode(entry)
    end

    return '{' .. table.concat(parts, ',') .. '}'
end

---@param text string
---@return any
function json.decode(text)
    local position = 1

    local function skip()
        position = text:find('[^%s]', position) or #text + 1
    end

    local parse

    local function parseString()
        local result = {}

        position = position + 1

        while true do
            local char = text:sub(position, position)

            if char == '' then
                error('unterminated string')
            end

            if char == '"' then
                position = position + 1
                return table.concat(result)
            end

            if char == '\\' then
                local escape = text:sub(position + 1, position + 1)

                if escape == 'u' then
                    result[#result + 1] = utf8.char(tonumber(text:sub(position + 2, position + 5), 16))
                    position = position + 6
                else
                    result[#result + 1] = ({
                        n = '\n',
                        t = '\t',
                        r = '\r',
                    })[escape] or escape
                    position = position + 2
                end
            else
                result[#result + 1] = char
                position = position + 1
            end
        end
    end

    parse = function()
        skip()

        local char = text:sub(position, position)

        if char == '{' then
            local result = {}

            position = position + 1
            skip()

            if text:sub(position, position) == '}' then
                position = position + 1
                return result
            end

            while true do
                skip()

                local key = parseString()

                skip()
                position = position + 1
                result[key] = parse()
                skip()

                local separator = text:sub(position, position)

                position = position + 1

                if separator == '}' then
                    return result
                end
            end
        end

        if char == '[' then
            local result = {}

            position = position + 1
            skip()

            if text:sub(position, position) == ']' then
                position = position + 1
                return result
            end

            while true do
                result[#result + 1] = parse()
                skip()

                local separator = text:sub(position, position)

                position = position + 1

                if separator == ']' then
                    return result
                end
            end
        end

        if char == '"' then
            return parseString()
        end

        for literal, value in pairs({
            ['true'] = true,
            ['false'] = false,
            ['null'] = json,
        }) do
            if text:sub(position, position + #literal - 1) == literal then
                position = position + #literal

                if value == json then
                    return nil
                end

                return value
            end
        end

        local number = text:match('^-?%d+%.?%d*[eE]?[-+]?%d*', position)

        position = position + #number

        return math.tointeger(tonumber(number)) or tonumber(number)
    end

    return parse()
end

return H
