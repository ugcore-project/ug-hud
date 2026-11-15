--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- The layout editor: the page takes the cursor, the player moves and styles widgets, and saves to KVP.

---@class UgHud.Internal.Editor
local Editor = {}
UgHud.Internal.Editor = Editor

local Nui = UgHud.Internal.Nui
local Settings = UgHud.Internal.Settings
local Display = UgHud.Internal.Display
local Enums = UgHud.Enums

local open = false
local enabled = true

---Turns the editor on or off. The owner MAY remove it: every player keeps the server's defaults.
---@param value boolean
function Editor.SetEnabled(value)
    enabled = value == true

    if not enabled then
        Editor.Close()
    end
end

---@return boolean
function Editor.IsOpen()
    return open
end

---Opens the editor, unless another resource holds the cursor or no character is loaded.
---@return boolean opened
function Editor.Open()
    if not enabled or open or IsNuiFocused() or IsPauseMenuActive() or LocalPlayer.state[UgCore.Enums.StateBags.Loaded] ~= true then
        return false
    end

    open = true
    Display.SetEditing(true)
    SetNuiFocus(true, true)
    Nui.Send(Enums.NuiAction.Editor, {
        open = true,
    })

    return true
end

function Editor.Close()
    if not open then
        return
    end

    open = false
    Display.SetEditing(false)
    SetNuiFocus(false, false)
    Nui.Send(Enums.NuiAction.Editor, {
        open = false,
    })
end

Nui.On(Enums.NuiCallback.Save, function(body)
    return open and Settings.Save(body.settings)
end)

Nui.On(Enums.NuiCallback.Close, function()
    if not open then
        return false
    end

    Editor.Close()

    return true
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() and open then
        SetNuiFocus(false, false)
    end
end)
