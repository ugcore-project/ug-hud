--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

local H = dofile('tests/helpers.lua')

---@param name string
---@return table?
local function keybind(name)
    for _, binding in ipairs(H.Keybinds) do
        if binding.name == name then
            return binding
        end
    end

    return nil
end

---The last value DisplayRadar was called with.
---@return boolean?
local function radar()
    local calls = H.CallsOf('DisplayRadar')

    return calls[#calls] and calls[#calls].args[1]
end

---Sits the player in a car and samples once.
---@param change? table
local function drive(change)
    H.Vehicle = {
        entity = 50,
        class = 0,
        speed = 20.0,
        driver = true,
    }

    for key, value in pairs(change or {}) do
        H.Vehicle[key] = value
    end

    H.Advance(300)
end

print('client')

H.Test('boot binds keys, configures the page and says ready', function()
    H.Reset()

    local lines = H.LoadClient()

    H.ExpectLine(lines, '[ug-hud] Ready: neon, /hud to customize.')
    H.Assert(keybind('editor') and keybind('seatbelt') and keybind('cruise'), 'three keybinds')
    H.Equal(keybind('editor').label, 'label:keybind.editor')
    H.Assert(H.Commands.hud, 'editor command')

    local config = H.LastPage('config')
    local defaults = H.Defaults()
    local look = config.owner.look

    config.owner.look = nil
    H.Equal(config.owner, {
        preset = 'neon', speedUnit = 'kmh', minimap = 'vehicle', accounts = { 'cash', 'bank' },
        fuel = true, seatbelt = true, cruise = true, voice = true, editorKey = 'I',
    })
    H.Equal(look, {
        defaults = defaults.defaults, widgets = defaults.widgets, cinematicWidgets = defaults.cinematicWidgets,
        statusColors = defaults.statusColors, alerts = defaults.alerts, editor = defaults.editor,
    })
    H.Equal(config.labels.editor.title, 'Customize your HUD')
    H.Equal(config.settings, nil)
end)

H.Test('owner switches remove keybinds and features', function()
    H.Reset()

    local defaults = H.Defaults()

    defaults.seatbelt.enabled, defaults.cruise.enabled = false, false
    H.LoadClient({
        seatbelt = defaults.seatbelt,
        cruise = defaults.cruise,
        fuel = {
            source = 'none',
        },
        voice = 'none',
    })

    H.Assert(not keybind('seatbelt') and not keybind('cruise'), 'no vehicle keybinds')
    H.Equal(H.LastPage('config').owner.fuel, false)
    H.Advance(300)
    H.Equal(H.LastPage('voice'), {
        enabled = false,
    })

    drive()
    H.Equal(H.LastPage('vehicle').seatbelt, nil)
    H.Equal(H.LastPage('vehicle').fuel, nil)
end)

H.Test('the owner MAY remove the editor: no key, no command, no save', function()
    H.Reset()

    local defaults = H.Defaults()

    defaults.editor.enabled = false

    local lines = H.LoadClient({
        editor = defaults.editor,
    })

    H.ExpectLine(lines, '[ug-hud] Ready: neon, editor off.')
    H.Assert(not keybind('editor'), 'no editor keybind')
    H.Assert(not H.Commands.hud, 'no editor command')
    H.Equal(UgHud.Internal.Editor.Open(), false)
    H.Equal(H.PostNui('save', {
        settings = '{"minimap":"never"}',
    }).ok, false)
    H.Equal(H.Kvp['ug-hud:Settings'], nil)
end)

H.Test('the ug-hud theme merges onto the ug-lib theme token by token', function()
    local merged = UgHud.Internal.Nui.Theme(
        {
            mode = 'dark',
            colors = {
                primary = '1 1% 1%',
                border = '2 2% 2%',
            },
            radius = '0.5rem',
        },
        {
            colors = {
                primary = '3 3% 3%',
            },
            scale = 1.2,
        }
    )

    H.Equal(merged, {
        mode = 'dark',
        colors = {
            primary = '3 3% 3%',
            border = '2 2% 2%',
        },
        radius = '0.5rem',
        scale = 1.2,
    })
    H.Equal(UgHud.Internal.Nui.Theme(nil, nil), {
        colors = {},
    })
    H.Equal(UgHud.Internal.Nui.Theme(nil, {
        colors = {
            primary = '3 3% 3%',
        },
    }).colors, {
        primary = '3 3% 3%',
    }, 'no ug-lib theme')
end)

H.Test('no config from the server keeps the HUD off', function()
    H.Reset()

    local lines = H.Load('client')

    H.Capture(function()
        H.Advance(61000)
    end)
    H.Assert(not H.Contains(lines, 'Ready:'), 'not ready')
    H.Equal(#H.Keybinds, 0)
end)

H.Test('samples the player and sends only changes', function()
    H.Reset()
    H.NativeReturns.GetEntityHealth = 150
    H.NativeReturns.GetPedArmour = 40
    H.NativeReturns.GetPlayerSprintStaminaRemaining = 25.0
    H.LoadClient()

    H.Equal(H.LastPage('player'), {
        health = 50,
        armor = 40,
        stamina = 75,
        oxygen = 100,
        underwater = false,
        deathState = 'Alive',
    })
    H.Equal(H.LastPage('identity').id, 7)
    H.Equal(H.LastPage('location').heading, 270)

    local sent = #H.CallsOf('SendNUIMessage')

    H.Advance(300)

    local player = 0

    for index = sent + 1, #H.PageMessages() do
        if H.PageMessages()[index].action == 'player' then
            player = player + 1
        end
    end

    H.Equal(player, 0, 'the same sample is not sent twice')
end)

H.Test('identity reads job and gang statebags', function()
    H.Reset()
    H.LoadClient()
    LocalPlayer.state[UgCore.Enums.StateBags.Job] = {
        name = 'police',
        label = 'Police',
        gradeLabel = 'Sergeant',
        onDuty = true,
        secret = 'x',
    }
    H.Advance(1100)

    H.Equal(H.LastPage('identity'), {
        id = 7,
        job = {
            name = 'police',
            label = 'Police',
            grade = 'Sergeant',
            onDuty = true,
        },
    })
end)

H.Test('needs and money come from ug-core when their modules run', function()
    H.Reset()
    H.Modules = {
        needs = true,
        accounts = true,
    }
    H.Needs = {
        hunger = 80,
    }
    H.Money = {
        cash = 100,
    }
    H.LoadClient()

    H.Equal(H.LastPage('needs'), {
        hunger = 80,
    })
    H.Equal(H.LastPage('money'), {
        cash = 100,
    })
    H.Equal(H.LastPage('config').needs, {
        hunger = 'Hunger',
        thirst = 'Thirst',
    })

    H.Money = {
        cash = 350,
    }
    H.CoreEvents[UgCore.Enums.Events.Accounts.Changed]()
    H.Equal(H.LastPage('money'), {
        cash = 350,
    })
end)

H.Test('a failing collector logs once and the others keep running', function()
    H.Reset()
    H.Modules = {
        needs = true,
        accounts = true,
    }
    H.Money = {
        cash = 100,
    }

    local lines = H.LoadClient()

    UgCore.Needs.GetAll = function()
        error('No such export NeedsGetAll in resource ug-core')
    end
    H.Money = {
        cash = 250,
    }
    lines = H.Capture(function()
        H.Advance(3000)
    end)

    H.Equal(H.LastPage('money'), {
        cash = 250,
    })
    H.ExpectLine(lines, '[ug-hud] Reading needs failed:')

    local count = 0

    for _, line in ipairs(lines) do
        if line:find('Reading needs failed', 1, true) then
            count = count + 1
        end
    end

    H.Equal(count, 1, 'logged once')
end)

H.Test('the HUD hides for the pause menu, faded screens, other resources and before loading', function()
    H.Reset()
    H.LoadClient()
    H.Equal(H.LastPage('visible'), {
        visible = true,
    })

    H.NativeReturns.IsPauseMenuActive = true
    H.Advance(300)
    H.Equal(H.LastPage('visible'), {
        visible = false,
    })

    H.NativeReturns.IsPauseMenuActive = false
    H.Export('SetHidden', 'ug-multicharacter', true)
    H.Advance(300)
    H.Equal(H.LastPage('visible'), {
        visible = false,
    })
    H.Equal(H.Export('IsVisible'), false)

    H.TriggerEvent('onClientResourceStop', 'ug-multicharacter')
    H.Advance(300)
    H.Equal(H.LastPage('visible'), {
        visible = true,
    })

    LocalPlayer.state[UgCore.Enums.StateBags.Loaded] = false
    H.Advance(300)
    H.Equal(H.LastPage('visible'), {
        visible = false,
    })
end)

H.Test('the minimap follows the mode: only in vehicles by default', function()
    H.Reset()
    H.LoadClient()
    H.Equal(radar(), false)

    drive()
    H.Equal(radar(), true)

    H.Vehicle = nil
    H.Advance(300)
    H.Equal(radar(), false)
end)

H.Test('the minimap rises by the owner lift, and goes back when the resource stops', function()
    H.Reset()
    H.LoadClient()
    H.Advance(100)

    local calls = H.CallsOf('SetMinimapComponentPosition')

    H.Equal(#calls, 3)
    H.Equal(calls[1].args[1], 'minimap')
    H.Assert(math.abs(calls[1].args[5] - (0.002 - 0.09)) < 1e-9, 'minimap raised by 0.09')
    H.Equal(H.CallsOf('SetBigmapActive')[1].args, { true, false })
    H.Equal(H.CallsOf('SetBigmapActive')[2].args, { false, false })

    H.TriggerEvent('onResourceStop', 'ug-hud')
    calls = H.CallsOf('SetMinimapComponentPosition')
    H.Equal(#calls, 6)
    H.Assert(math.abs(calls[4].args[5] - 0.002) < 1e-9, 'minimap back in place')
end)

H.Test('on a wide screen the minimap keeps its shape and moves into the area of the HUD page', function()
    H.Reset()
    H.NativeReturns.GetAspectRatio = 21 / 9
    H.LoadClient()
    H.Advance(100)

    H.Equal(H.PostNui('viewport', {
        width = 1e9,
        height = 1080,
    }).ok, false)
    H.Equal(H.PostNui('viewport', {
        width = 1920,
        height = 1080,
    }).ok, true)

    local calls = H.CallsOf('SetMinimapComponentPosition')
    local minimap = calls[#calls - 2].args
    local stretch = (21 / 9) / (16 / 9)
    local margin = (1 - (16 / 9) / (21 / 9)) / 2

    H.Equal(minimap[1], 'minimap')
    H.Assert(math.abs(minimap[4] - (margin - 0.0045 / stretch) / stretch) < 1e-9, 'x inside the page area')
    H.Assert(math.abs(minimap[6] - 0.150 / (stretch * stretch)) < 1e-9, 'width not stretched')
    H.Assert(math.abs(minimap[5] - (0.002 - 0.09)) < 1e-9, 'still raised')
end)

H.Test('no lift keeps the game minimap untouched', function()
    H.Reset()
    H.LoadClient({
        minimapLift = 0,
    })
    H.Advance(100)
    H.Equal(#H.CallsOf('SetMinimapComponentPosition'), 0)
end)

H.Test('a saved minimap mode wins over the owner default', function()
    H.Reset()
    H.Kvp['ug-hud:Settings'] = '{"minimap":"always"}'
    H.LoadClient()

    H.Equal(radar(), true)
    H.Equal(H.LastPage('config').settings, '{"minimap":"always"}')
end)

H.Test('the vehicle payload: kind, speed, fuel, lights, gear', function()
    H.Reset()
    H.LoadClient()
    drive({
        class = 8,
    })

    H.Equal(H.LastPage('vehicle'), {
        active = true, kind = 'bike', driver = true, speed = 20.0, rpm = 0.2, gear = 1, fuel = 50.0,
        engine = 100, body = 100, cruise = false, lights = 1,
    })

    drive({
        class = 15,
    })
    H.Equal(H.LastPage('vehicle').kind, 'air')
    H.Equal(H.LastPage('vehicle').altitude, 0)

    H.Vehicle = nil
    H.Advance(300)
    H.Equal(H.LastPage('vehicle'), {
        active = false,
    })
end)

H.Test('fuel reads a statebag or an export, and ignores garbage', function()
    H.Reset()
    H.LoadClient()

    local Vehicle = UgHud.Internal.Vehicle

    Entity = function()
        return {
            state = {
                fuel = 42.345,
            },
        }
    end
    H.Equal(Vehicle.Fuel({
        fuel = {
            source = 'statebag',
            key = 'fuel',
        },
    }, 50), 42.3)

    H.NativeReturns.GetResourceState = 'started'
    H.Remote.LegacyFuel = {
        GetFuel = function(_, vehicle) return vehicle == 50 and 300 or 0 end,
    }
    H.Equal(Vehicle.Fuel({
        fuel = {
            source = 'export',
            resource = 'LegacyFuel',
            fn = 'GetFuel',
        },
    }, 50), 100)

    H.Remote.LegacyFuel = {
        GetFuel = function() error('boom') end,
    }
    H.Equal(Vehicle.Fuel({
        fuel = {
            source = 'export',
            resource = 'LegacyFuel',
            fn = 'GetFuel',
        },
    }, 50), nil)

    H.NativeReturns.GetVehicleFuelLevel = 0 / 0
    H.Equal(Vehicle.Fuel({
        fuel = {
            source = 'native',
        },
    }, 50), nil)
    Entity = nil
end)

H.Test('seatbelt: cars only, locks the exit, resets on leaving', function()
    H.Reset()
    H.LoadClient()

    keybind('seatbelt').onPressed()
    H.Equal(UgHud.Internal.Vehicle.HasSeatbelt(), false, 'not in a vehicle')

    drive({
        class = 8,
    })
    keybind('seatbelt').onPressed()
    H.Equal(UgHud.Internal.Vehicle.HasSeatbelt(), false, 'bikes have none')

    drive({
        entity = 51,
        class = 0,
    })
    H.Equal(H.LastPage('vehicle').seatbelt, false, 'unbuckled is sent, so the page warns')
    keybind('seatbelt').onPressed()
    H.Advance(300)
    H.Equal(H.LastPage('vehicle').seatbelt, true)

    H.Natives = {}
    H.Advance(20)
    H.Assert(#H.CallsOf('DisableControlAction') > 0, 'exit locked')

    H.Vehicle = nil
    H.Advance(300)
    H.Equal(UgHud.Internal.Vehicle.HasSeatbelt(), false)
end)

H.Test('a crash without a seatbelt ejects, with one it does not', function()
    H.Reset()
    H.LoadClient()
    drive({
        speed = 30.0,
    })
    H.Vehicle.speed = 5.0
    H.Advance(100)

    H.Equal(#H.CallsOf('SetPedToRagdoll'), 1)
    H.Equal(H.CallsOf('SetEntityCoords')[1].args, { 1, 1.0, 2.0, 3.0, true, true, true, false })

    H.Reset()
    H.LoadClient()
    drive({
        speed = 30.0,
    })
    keybind('seatbelt').onPressed()
    H.Vehicle.speed = 5.0
    H.Advance(100)

    H.Equal(#H.CallsOf('SetPedToRagdoll'), 0)
end)

H.Test('slowing down gently never ejects', function()
    H.Reset()
    H.LoadClient()
    drive({
        speed = 30.0,
    })

    for speed = 28, 0, -2 do
        H.Vehicle.speed = speed + 0.0
        H.Advance(100)
    end

    H.Equal(#H.CallsOf('SetPedToRagdoll'), 0)
end)

H.Test('cruise: drivers only, holds the speed, the brake cancels it', function()
    H.Reset()
    H.LoadClient()
    drive({
        driver = false,
    })
    keybind('cruise').onPressed()
    H.Equal(UgHud.Internal.Vehicle.State().cruise, false, 'passengers cannot')

    drive({
        entity = 52,
        speed = 1.0,
    })
    keybind('cruise').onPressed()
    H.Equal(UgHud.Internal.Vehicle.State().cruise, false, 'too slow')

    H.Vehicle.speed = 25.0
    keybind('cruise').onPressed()
    H.Equal(UgHud.Internal.Vehicle.State().cruise, true)
    H.Equal(H.CallsOf('SetEntityMaxSpeed')[1].args, { 52, 25.0 })

    H.Pressed[72] = true
    H.Advance(20)
    H.Equal(UgHud.Internal.Vehicle.State().cruise, false)

    local calls = H.CallsOf('SetEntityMaxSpeed')

    H.Equal(calls[#calls].args, { 52, 500.0 })
end)

H.Test('custom statuses: validated, owned, shown and removed with their resource', function()
    H.Reset()
    H.LoadClient()

    H.Export('AddStatus', 'ug-drugs', 'drunk', {
        label = 'Drunk',
        icon = 'beer',
        color = '#facc15',
        value = 150,
    })
    H.Equal(H.LastPage('statuses'), {
        {
            name = 'drunk',
            label = 'Drunk',
            icon = 'beer',
            color = '#facc15',
            value = 100,
        },
    })

    H.Equal(H.Export('SetStatus', 'ug-drugs', 'drunk', 30), true)
    H.Equal(H.LastPage('statuses')[1].value, 30)
    H.Equal(H.Export('SetStatus', 'ug-other', 'drunk', 90), false)
    H.Raises(function() H.Export('AddStatus', 'ug-other', 'drunk', { label = 'Mine' }) end, 'belongs to ug-drugs')
    H.Raises(function() H.Export('AddStatus', 'x', 'bad name', { label = 'X' }) end, 'name MUST')
    H.Raises(function() H.Export('AddStatus', 'x', 'ok', { label = 'X', color = 'red' }) end, 'color MUST')
    H.Raises(function() H.Export('AddStatus', 'x', 'ok', { label = 'X', icon = '<b>' }) end, 'icon MUST')
    H.Raises(function() H.Export('AddStatus', 'x', 'ok', { label = string.rep('x', 33) }) end, 'label MUST')

    for index = 1, 15 do
        H.Export('AddStatus', 'ug-many', 's' .. index, {
            label = 'S',
        })
    end

    H.Raises(function() H.Export('AddStatus', 'ug-many', 'one-more', { label = 'S' }) end, 'at most 16')

    H.TriggerEvent('onClientResourceStop', 'ug-many')
    H.Equal(#H.LastPage('statuses'), 1)
    H.Equal(H.Export('RemoveStatus', 'ug-drugs', 'drunk'), true)
    H.Equal(H.LastPage('statuses'), {})
end)

H.Test('the editor opens only for a loaded player with a free cursor', function()
    H.Reset()
    H.LoadClient()
    H.NativeReturns.IsNuiFocused = true
    keybind('editor').onPressed()
    H.Equal(UgHud.Internal.Editor.IsOpen(), false)

    H.NativeReturns.IsNuiFocused = false
    LocalPlayer.state[UgCore.Enums.StateBags.Loaded] = false
    H.Commands.hud.handler()
    H.Equal(UgHud.Internal.Editor.IsOpen(), false)

    LocalPlayer.state[UgCore.Enums.StateBags.Loaded] = true
    H.Commands.hud.handler()
    H.Equal(UgHud.Internal.Editor.IsOpen(), true)
    H.Equal(H.LastPage('editor'), {
        open = true,
    })
    H.Equal(H.CallsOf('SetNuiFocus')[1].args, { true, true })

    H.Equal(H.PostNui('close', {}).ok, true)
    H.Equal(H.LastPage('editor'), {
        open = false,
    })
    H.Equal(H.PostNui('close', {}).ok, false)
end)

H.Test('the editor keeps the HUD visible while the player is not loaded', function()
    H.Reset()
    H.LoadClient()
    UgHud.Internal.Editor.Open()
    LocalPlayer.state[UgCore.Enums.StateBags.Loaded] = false
    H.Advance(300)

    H.Equal(H.LastPage('visible'), {
        visible = true,
    })
end)

H.Test('saves only bounded JSON objects, and only from the open editor', function()
    H.Reset()
    H.LoadClient()

    H.Equal(H.PostNui('save', {
        settings = '{"minimap":"never"}',
    }).ok, false, 'editor shut')
    UgHud.Internal.Editor.Open()

    H.Equal(H.PostNui('save', {
        settings = '{"minimap":"never"}',
    }).ok, true)
    H.Equal(H.Kvp['ug-hud:Settings'], '{"minimap":"never"}')
    H.Advance(300)
    H.Equal(radar(), false)

    H.Advance(1000)
    H.Equal(H.PostNui('save', {
        settings = '[1,2]',
    }).ok, true, 'arrays are tables too, the page checks shape')
    H.Equal(H.PostNui('save', {
        settings = '{"x":"',
    }).ok, false)
    H.Equal(H.PostNui('save', {
        settings = 5,
    }).ok, false)
    H.Equal(H.PostNui('save', {
        settings = '"text"',
    }).ok, false)
    H.Equal(H.PostNui('save', {
        settings = '{"x":"' .. string.rep('a', 33000) .. '"}',
    }).ok, false)
    H.Equal(H.PostNui('save', 'nope').ok, false)
end)

H.Test('the game HUD parts are hidden every frame while the HUD shows', function()
    H.Reset()
    H.LoadClient()
    H.Natives = {}
    H.Advance(16)

    H.Equal(#H.CallsOf('HideHudComponentThisFrame'), 8)
end)

H.Test('voice reads pma-voice: mode, talking and radio, ten times a second', function()
    H.Reset()
    H.LoadClient()
    H.Advance(300)
    H.Equal(H.LastPage('voice'), {
        enabled = true,
        talking = false,
        radioTalking = false,
    }, 'no pma-voice')

    H.NativeReturns.GetResourceState = 'started'
    H.NativeReturns.MumbleIsPlayerTalking = 1
    LocalPlayer.state.proximity = {
        index = 3,
        distance = 6.0,
        mode = 'Shouting',
    }
    H.Advance(100)
    H.Equal(H.LastPage('voice'), {
        enabled = true,
        talking = true,
        radioTalking = false,
        mode = 'Shouting',
        level = 3,
    })

    LocalPlayer.state.proximity = {
        distance = 1.5,
        mode = 'Custom',
    }
    LocalPlayer.state.radioChannel = 101
    LocalPlayer.state.radioActive = true
    H.NativeReturns.MumbleIsPlayerTalking = false
    H.Advance(100)
    H.Equal(H.LastPage('voice'), {
        enabled = true,
        talking = false,
        radioTalking = true,
        mode = 'Custom',
        level = 1,
        radio = 101,
    })

    LocalPlayer.state.radioChannel = 0
    H.Advance(100)
    H.Equal(H.LastPage('voice').radio, nil)
    H.Equal(H.LastPage('voice').radioTalking, false, 'off the radio')
end)

H.Done()
