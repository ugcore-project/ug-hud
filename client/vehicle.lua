--[[

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

]] --

-- The vehicle the player sits in: gauges, fuel, seatbelt and cruise control.

---@class UgHud.Internal.Vehicle
local Vehicle = {}
UgHud.Internal.Vehicle = Vehicle

local Nui = UgHud.Internal.Nui
local Enums = UgHud.Enums
local Kind = Enums.VehicleKind
local FuelSource = Enums.FuelSource

-- Control indices from the Cfx controls reference.
local CONTROL_EXIT = 75
local CONTROL_BRAKE = 72
-- GetVehicleClass values from the Cfx docs.
local CLASS_KIND = {
    [8] = Kind.Bike,
    [13] = Kind.Bike,
    [14] = Kind.Boat,
    [15] = Kind.Air,
    [16] = Kind.Air,
}
local KMH = 3.6
-- Cruise needs some speed to hold. m/s.
local CRUISE_MIN = 2.0
-- No vehicle reaches this: lifts the cap cruise set. m/s.
local NO_LIMIT = 500.0

---@class UgHudVehicleState
---@field entity? integer
---@field seatbelt boolean
---@field cruise boolean
---@field lastSpeed number km/h at the previous sample
---@field lastVelocity? vector3

---@type UgHudVehicleState
local state = {
    seatbelt = false,
    cruise = false,
    lastSpeed = 0.0,
}

---@param value number
---@param places integer
---@return number
local function round(value, places)
    local scale = 10 ^ places

    return math.floor(value * scale + 0.5) / scale
end

---@param value number
---@return number
local function percent(value)
    return math.min(math.max(value, 0), 100)
end

---@param vehicle integer
---@return UgHudVehicleKind
function Vehicle.KindOf(vehicle)
    return CLASS_KIND[GetVehicleClass(vehicle)] or Kind.Car
end

---@param settings table the owner config
---@param vehicle integer
---@return number? fuel 0 to 100, nil when unknown
function Vehicle.Fuel(settings, vehicle)
    local fuel = settings.fuel
    local value = nil

    if fuel.source == FuelSource.Native then
        value = GetVehicleFuelLevel(vehicle)
    elseif fuel.source == FuelSource.StateBag then
        value = Entity(vehicle).state[fuel.key]
    elseif fuel.source == FuelSource.Export and GetResourceState(fuel.resource) == 'started' then
        local ok, result = pcall(function()
            local api = exports[fuel.resource]

            return api[fuel.fn](api, vehicle)
        end)

        value = ok and result or nil
    end

    return type(value) == 'number' and value == value and round(percent(value), 1) or nil
end

---@return boolean
function Vehicle.HasSeatbelt()
    return state.seatbelt
end

---@return integer? vehicle the vehicle the player sits in
local function current()
    local ped = PlayerPedId()

    if not IsPedInAnyVehicle(ped, false) then
        return nil
    end

    local vehicle = GetVehiclePedIsIn(ped, false)

    return vehicle ~= 0 and vehicle or nil
end

---@param vehicle integer
---@param on boolean
local function setCruise(vehicle, on)
    state.cruise = on
    SetEntityMaxSpeed(vehicle, on and GetEntitySpeed(vehicle) or NO_LIMIT)
end

function Vehicle.ToggleSeatbelt()
    local vehicle = current()

    if vehicle and Vehicle.KindOf(vehicle) == Kind.Car then
        state.seatbelt = not state.seatbelt
    end
end

function Vehicle.ToggleCruise()
    local vehicle = current()

    if not vehicle or GetPedInVehicleSeat(vehicle, -1) ~= PlayerPedId() then
        return
    end

    if state.cruise then
        setCruise(vehicle, false)
    elseif GetEntitySpeed(vehicle) >= CRUISE_MIN then
        setCruise(vehicle, true)
    end
end

---Throws the player out of the windscreen at the vehicle's last speed.
---@param vehicle integer
---@param velocity vector3
local function eject(vehicle, velocity)
    local ped = PlayerPedId()
    local coords = GetOffsetFromEntityInWorldCoords(vehicle, 0.0, 1.6, 0.6)

    SetEntityCoords(ped, coords.x, coords.y, coords.z, true, true, true, false)
    SetEntityVelocity(ped, velocity.x, velocity.y, velocity.z)
    SetPedToRagdoll(ped, 2500, 2500, 0, false, false, false)
end

---@param settings table the owner config
---@param vehicle integer
---@param speed number km/h
local function checkCrash(settings, vehicle, speed)
    local seatbelt = settings.seatbelt
    local lastVelocity = state.lastVelocity

    if seatbelt.enabled and not state.seatbelt and lastVelocity and Vehicle.KindOf(vehicle) == Kind.Car
        and state.lastSpeed > seatbelt.ejectSpeed and state.lastSpeed - speed > seatbelt.ejectDrop then
        state.lastVelocity, state.lastSpeed = nil, 0.0
        eject(vehicle, lastVelocity)

        return
    end

    state.lastSpeed = speed
    state.lastVelocity = GetEntityVelocity(vehicle)
end

---Reads the vehicle and sends it to the page. Leaving a vehicle unbuckles and stops cruise.
---@param settings table the owner config
---@return boolean inVehicle
function Vehicle.Sample(settings)
    local vehicle = current()

    if vehicle ~= state.entity then
        if state.entity and state.cruise and DoesEntityExist(state.entity) then
            setCruise(state.entity, false)
        end

        state.entity, state.seatbelt, state.cruise, state.lastSpeed, state.lastVelocity = vehicle, false, false, 0.0, nil
    end

    if not vehicle then
        Nui.SendIfChanged(Enums.NuiAction.Vehicle, {
            active = false,
        })

        return false
    end

    local kind = Vehicle.KindOf(vehicle)
    local speed = GetEntitySpeed(vehicle)
    local driver = GetPedInVehicleSeat(vehicle, -1) == PlayerPedId()

    checkCrash(settings, vehicle, speed * KMH)

    if state.cruise and not driver then
        setCruise(vehicle, false)
    end

    local _, lights, highBeams = GetVehicleLightsState(vehicle)
    local payload = {
        active = true,
        kind = kind,
        driver = driver,
        speed = round(speed, 1),
        rpm = round(GetVehicleCurrentRpm(vehicle), 2),
        gear = GetVehicleCurrentGear(vehicle),
        fuel = Vehicle.Fuel(settings, vehicle),
        engine = round(percent(GetVehicleEngineHealth(vehicle) / 10), 0),
        body = round(percent(GetVehicleBodyHealth(vehicle) / 10), 0),
        lights = (highBeams == 1 or highBeams == true) and 2 or ((lights == 1 or lights == true) and 1 or 0),
        altitude = kind == Kind.Air and round(GetEntityHeightAboveGround(vehicle), 0) or nil,
    }

    -- Set apart: `x and false or nil` is nil, and the page reads a missing field as "no seatbelt".
    if settings.seatbelt.enabled and kind == Kind.Car then
        payload.seatbelt = state.seatbelt
    end

    if settings.cruise.enabled then
        payload.cruise = state.cruise
    end

    Nui.SendIfChanged(Enums.NuiAction.Vehicle, payload)

    return true
end

---Per-frame vehicle rules: buckled players cannot leave, and braking stops cruise.
function Vehicle.Frame()
    if not state.entity then
        return
    end

    if state.seatbelt then
        DisableControlAction(0, CONTROL_EXIT, true)
    end

    if state.cruise and IsControlJustPressed(0, CONTROL_BRAKE) then
        setCruise(state.entity, false)
    end
end

---For tests and the editor.
---@return UgHudVehicleState
function Vehicle.State()
    return state
end
