---
name: testing
description: Write and run tests for a UgCore resource - Lua 5.4 suites with native mocks in tests/, and vitest for the web page. Use when adding behavior, fixing a bug, or adding a mock.
---

# Testing

Every change in behavior adds or extends a test. Tests cover behavior, not cosmetics (banners, colors).

## Lua

Plain Lua 5.4 scripts, one suite per area: `tests/server.lua`, `tests/client.lua`, `tests/nui.lua`. They load the real
ug-core and ug-lib shared code (schema, enums, string utils) from `../ug-core` and `../ug-lib`, and your scripts in
manifest order.

```bash
lua5.4 tests/server.lua
```

A suite prints `ok` or `FAIL` per test and exits 1 on any failure.

### Shape of a test

```lua
H.Test('owner values replace defaults key by key', function()
    boot("return { preset = 'sport', speedUnit = 'mph', fuel = { source = 'statebag', key = 'fuel' } }")

    local config = GlobalState['ug-hud:Config']

    H.Equal(config.preset, 'sport')
    H.Equal(config.fuel, { source = 'statebag', key = 'fuel' })
    H.Equal(config.editorKey, 'I')
end)
```

Each suite has small local helpers (`start`, `boot`) that reset the mocks, write a `config.lua` and load a side.

### Helpers (`tests/helpers.lua`)

| Helper | Does |
| --- | --- |
| `H.Reset()` | Fresh mocks. Change mocks after it, before `H.Load`. |
| `H.Load(side)` | Loads ug-core and ug-lib parts, the side's mocks, then the manifest scripts. Returns printed lines. |
| `H.LoadClient(overrides?)` | Publishes the defaults (with overrides) to GlobalState, loads the client, posts `ready`. |
| `H.Defaults()` | `server/config.default.lua` values. |
| `H.Export(name, resource, ...)` | Calls an export as another resource, so `GetInvokingResource()` is that resource. |
| `H.TriggerEvent(name, source, ...)` | Fires an event handler, such as `playerDropped` or `onResourceStop`. |
| `H.PostNui(name, body)` | Posts to a NUI callback like the page. Returns the reply. |
| `H.LastPage(action)` | Last payload sent to the page with that action. |
| `H.PageMessages()` | Every message sent to the page, in order. |
| `H.Advance(ms)` | Runs threads and timers in 16 ms frames. `Wait` yields until it reaches them. |
| `H.Files[path]` | Fake file content, `false` for missing. `H.Saved` holds what was written. |
| `H.Kvp` | Client KVP store, where saved settings land. |
| `H.NativeReturns[name]` | Answer of an auto-mocked native. Any PascalCase global is a recorded native. |
| `H.CallsOf(name)` | Recorded calls of a native, such as `SetNuiFocus`. |
| `H.Needs`, `H.Money`, `H.DeathState` | What the ug-core mocks report to the HUD. |
| `H.Capture(fn)` | Runs `fn` and returns the lines it printed. |
| `H.Equal`, `H.Assert`, `H.Contains`, `H.ExpectLine` | Assertions. `H.Equal` compares tables deeply. |
| `H.Any(value)` | Passes a wrong-type value without a LuaLS error. |

### Adding a mock

When code calls a new ug-core or ug-lib function, add it to `installServer` or `installClient` in `tests/helpers.lua`,
backed by an `H.` table the test can set and read. Reset it in `H.Reset`. Mock the documented behavior and return
shapes, such as `ok, value, errorCode`. ug-appearance's and ug-hud's helpers have many ready-made mocks
(characters, sessions, jobs, streaming, keybinds, KVP).

### What to test

- Server: success, each refusal (distance, cooldown, not loaded, bad config), forged arguments, a failure halfway
  (payment, database) and that it rolls back.
- Client: what is sent to the server and the page, forged NUI bodies refused, focus released on every close path.
- Contracts (`tests/nui.lua`): Lua and TS enums equal, every locale has the same keys, every error code has a text.
- Config: defaults equal the example, bad values reported, sandbox has no `os`.

## Web

vitest with Testing Library and jsdom. `web/src/**/*.test.ts(x)`.

```bash
cd web && npm test
```

- Mock `@/lib/nui` with `vi.mock` and check what was sent.
- Send Lua messages through the store's `handleMessage` inside `act`.
- `MotionGlobalConfig.skipAnimations = true`, and `waitFor` for elements leaving through `AnimatePresence`.
- `security.test.ts` scans sources: keep it.

## CI

`.github/workflows/ci.yml` runs LuaLS, every Lua suite, the repository check and the web checks on pushes and pull
requests to `dev` and `main`. Pin `UG_CORE_REF` and `UG_LIB_REF` to commit SHAs for reproducible builds.

## Docs

- https://ugcore.urging.ch/contributing/testing
