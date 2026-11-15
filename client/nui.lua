--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- The page bridge. The page is untrusted: every callback body is checked here.

---@class UgHud.Internal.Nui
local Nui = {}
UgHud.Internal.Nui = Nui

local Enums = UgHud.Enums
local Action = Enums.NuiAction
local Callback = Enums.NuiCallback

local RESOURCE = GetCurrentResourceName()
-- Callbacks per second the page MAY send. It posts from the editor, on save and close, and its size on resize.
local EVENTS_PER_SECOND = 10
local FALLBACK_LOCALE = 'en'

local ready = false
---@type table[] messages sent before the page was ready
local queue = {}
local budget = {
    second = -1,
    count = 0,
}
---@type table<UgHudNuiCallback, fun(body: table): boolean>
local handlers = {}
---@type table<UgHudNuiAction, any> last payload per action, to skip sending the same thing again
local last = {}
---@type (fun(): table)?
local configBuilder = nil

---@param a any
---@param b any
---@return boolean
local function same(a, b)
    if type(a) ~= 'table' or type(b) ~= 'table' then
        return a == b
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

---@param action UgHudNuiAction
---@param payload any
local function post(action, payload)
    local message = {
        action = action,
        payload = payload,
    }

    if ready then
        SendNUIMessage(message)
    else
        queue[#queue + 1] = message
    end
end

---Sends a message, or queues it until the page is ready.
---@param action UgHudNuiAction
---@param payload? any
function Nui.Send(action, payload)
    last[action] = payload
    post(action, payload)
end

---Sends only when the payload differs from the last one sent for this action.
---@param action UgHudNuiAction
---@param payload any
---@return boolean sent
function Nui.SendIfChanged(action, payload)
    if last[action] ~= nil and same(last[action], payload) then
        return false
    end

    Nui.Send(action, payload)

    return true
end

---The `page` group of locales/<code>.json, or of English when that file is missing or broken.
---@return table
function Nui.Labels()
    for _, code in ipairs({ UgLib.Locale.GetCode(), FALLBACK_LOCALE }) do
        local content = LoadResourceFile(RESOURCE, ('locales/%s.json'):format(code))

        if content then
            local ok, decoded = pcall(json.decode, content)

            if ok and type(decoded) == 'table' and type(decoded.page) == 'table' then
                return decoded.page
            end
        end
    end

    return {}
end

---Sets what the page gets as its config, and sends it when the page is up.
---@param builder fun(): table
function Nui.Configure(builder)
    configBuilder = builder

    if ready then
        SendNUIMessage({
            action = Action.Config,
            payload = builder(),
        })
    end
end

---ug-lib's theme with the owner's ug-hud overrides on top. Colors merge token by token.
---@param base table? ug-lib's theme
---@param own table? the ug-hud theme
---@return table
function Nui.Theme(base, own)
    base = type(base) == 'table' and base or {}
    own = type(own) == 'table' and own or {}

    local colors = {}

    -- Not ipairs over both: it stops at a missing ug-lib table and drops the owner colors.
    for index = 1, 2 do
        local source = index == 1 and base.colors or own.colors

        if type(source) == 'table' then
            for token, color in pairs(source) do
                colors[token] = color
            end
        end
    end

    return {
        mode = own.mode or base.mode,
        colors = colors,
        radius = own.radius or base.radius,
        font = own.font or base.font,
        scale = own.scale or base.scale,
    }
end

---Sets who handles a page callback. The handler returns whether the body was accepted.
---@param callback UgHudNuiCallback
---@param handler fun(body: table): boolean
function Nui.On(callback, handler)
    handlers[callback] = handler
end

---@return boolean
local function withinBudget()
    local second = GetGameTimer() // 1000

    if budget.second ~= second then
        budget.second, budget.count = second, 0
    end

    budget.count = budget.count + 1

    return budget.count <= EVENTS_PER_SECOND
end

for _, name in ipairs({ Callback.Save, Callback.Close, Callback.Viewport }) do
    RegisterNUICallback(name, function(body, cb)
        local ok = false

        if withinBudget() and type(body) == 'table' and handlers[name] then
            ok = handlers[name](body) == true
        end

        cb({
            ok = ok,
        })
    end)
end

-- The page reloads after a crash or a restart: config first, then the last state of every action.
RegisterNUICallback(Callback.Ready, function(_, cb)
    local wasReady = ready

    ready = true

    if configBuilder then
        SendNUIMessage({
            action = Action.Config,
            payload = configBuilder(),
        })
    end

    if wasReady then
        for action, payload in pairs(last) do
            SendNUIMessage({
                action = action,
                payload = payload,
            })
        end
    else
        for _, message in ipairs(queue) do
            SendNUIMessage(message)
        end
    end

    queue = {}
    cb({
        ok = true,
    })
end)
