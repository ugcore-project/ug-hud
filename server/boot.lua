--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- Last server script: loads config. The HUD runs on clients only: the server has nothing else to do.

local Config = UgHud.Internal.Config
local Logger = UgCore.Logger

local RESOURCE = GetCurrentResourceName()

CreateThread(function()
    local ok, errors = Config.Load()

    if not ok then
        for _, message in ipairs(errors) do
            Logger.Error(message)
        end

        Logger.Error('Config invalid: %d error(s). ug-hud stays hidden.', #errors)

        return
    end

    print(('[ug-hud] v%s ready.'):format(GetResourceMetadata(RESOURCE, 'version', 0) or '?'))
end)
