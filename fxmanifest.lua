--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

---@diagnostic disable: undefined-global

fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'ug-hud'
author 'UgCore Framework & Contributors'
version '1.0.0' -- x-release-please-version
description 'Player HUD for UgCore: status, needs, money, speedometer, compass and a drag-and-drop editor'
repository 'https://github.com/ugcore-project/ug-hud'

ugcore_version '1.0.0'
uglib_version '1.0.0'

dependencies {
    '/onesync',
    'ug-core',
    'ug-lib',
}

shared_scripts {
    '@ug-core/import.lua',
    '@ug-lib/import.lua',
    'shared/init.lua',
    'shared/enums.lua',
}

server_scripts {
    'server/config.lua',
    'server/boot.lua',
}

client_scripts {
    'client/nui.lua',
    'client/settings.lua',
    'client/statuses.lua',
    'client/display.lua',
    'client/vehicle.lua',
    'client/collect.lua',
    'client/editor.lua',
    'client/boot.lua',
}

ui_page 'web/dist/index.html'

files {
    'locales/*.json',
    'web/dist/index.html',
    'web/dist/assets/*',
}
