--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- Custom statuses other resources show in the status widget, such as drunk, nitro or a radiation meter.
-- They are display only: the resource that adds one owns its value. Removed when that resource stops.

---@class UgHud.Internal.Statuses
local Statuses = {}
UgHud.Internal.Statuses = Statuses

local NAME_PATTERN = '^[%w_%-]+$'
local ICON_PATTERN = '^[%w%- ]+$'
local COLOR_PATTERN = '^#%x%x%x%x%x%x$'
local MAX_STATUSES = 16

---@class UgHudStatus
---@field name string
---@field label string
---@field icon string
---@field color string `#rrggbb`
---@field value number 0 to 100
---@field resource string

---@type UgHudStatus[]
local list = {}
---@type fun()?
local onChange = nil

---@param level integer
---@param message string
---@param ... any
local function raise(level, message, ...)
    error('[ug-hud] ' .. message:format(...), level + 1)
end

---@param value any
---@return number
local function percent(value)
    if type(value) ~= 'number' or value ~= value then
        return 0
    end

    return math.min(math.max(value, 0), 100)
end

---@param name string
---@return integer?
local function indexOf(name)
    for index, status in ipairs(list) do
        if status.name == name then
            return index
        end
    end

    return nil
end

local function changed()
    if onChange then
        onChange()
    end
end

---@param fn fun()
function Statuses.OnChange(fn)
    onChange = fn
end

---What the page gets: every field but the resource.
---@return table[]
function Statuses.Present()
    local presented = {}

    for index, status in ipairs(list) do
        presented[index] = {
            name = status.name,
            label = status.label,
            icon = status.icon,
            color = status.color,
            value = status.value,
        }
    end

    return presented
end

---Adds a status, or replaces one with the same name from the same resource.
---@param resource string
---@param name any
---@param options any { label, icon?, color?, value? }
function Statuses.Add(resource, name, options)
    if type(name) ~= 'string' or #name > 32 or not name:find(NAME_PATTERN) then
        raise(3, 'AddStatus: name MUST be 1 to 32 letters, digits, dashes or underscores')
    end

    if type(options) ~= 'table' or type(options.label) ~= 'string' or options.label == '' or #options.label > 32 then
        raise(3, 'AddStatus: label MUST be a string of 1 to 32 characters')
    end

    if options.icon ~= nil and (type(options.icon) ~= 'string' or #options.icon > 48 or not options.icon:find(ICON_PATTERN)) then
        raise(3, 'AddStatus: icon MUST be an icon name such as "flame"')
    end

    if options.color ~= nil and (type(options.color) ~= 'string' or not options.color:find(COLOR_PATTERN)) then
        raise(3, 'AddStatus: color MUST be a hex color such as "#ff8800"')
    end

    local index = indexOf(name)

    if index and list[index].resource ~= resource then
        raise(3, 'AddStatus: "%s" belongs to %s', name, list[index].resource)
    end

    if not index and #list >= MAX_STATUSES then
        raise(3, 'AddStatus: at most %d statuses', MAX_STATUSES)
    end

    list[index or #list + 1] = {
        name = name,
        label = options.label,
        icon = options.icon or 'circle',
        color = options.color or '#a78bfa',
        value = percent(options.value),
        resource = resource,
    }
    changed()
end

---@param resource string
---@param name any
---@param value any
---@return boolean ok false when the status does not exist or belongs to another resource
function Statuses.Set(resource, name, value)
    local index = type(name) == 'string' and indexOf(name) or nil

    if not index or list[index].resource ~= resource then
        return false
    end

    local clean = percent(value)

    if list[index].value ~= clean then
        list[index].value = clean
        changed()
    end

    return true
end

---@param resource string
---@param name any
---@return boolean removed
function Statuses.Remove(resource, name)
    local index = type(name) == 'string' and indexOf(name) or nil

    if not index or list[index].resource ~= resource then
        return false
    end

    table.remove(list, index)
    changed()

    return true
end

---Removes every status of a resource.
---@param resource string
function Statuses.RemoveResource(resource)
    local removed = false

    for index = #list, 1, -1 do
        if list[index].resource == resource then
            table.remove(list, index)
            removed = true
        end
    end

    if removed then
        changed()
    end
end

---@return string
local function caller()
    return GetInvokingResource() or GetCurrentResourceName()
end

exports('AddStatus', function(name, options)
    Statuses.Add(caller(), name, options)
end)

exports('SetStatus', function(name, value)
    return Statuses.Set(caller(), name, value)
end)

exports('RemoveStatus', function(name)
    return Statuses.Remove(caller(), name)
end)

AddEventHandler('onClientResourceStop', function(resource)
    Statuses.RemoveResource(resource)
end)
