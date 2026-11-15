# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot, ...) working on `ug-hud`.
Humans: read it too. It is the short version of every UgCore rule that matters when you write a resource.

When a rule here conflicts with habit or with other frameworks (QBCore, QBox, ESX, ox_lib), this file wins.

## What this is

A FiveM resource for the UgCore framework. Lua 5.4 on the game side, React + TypeScript for the NUI page.
Org: https://github.com/ugcore-project. Docs: https://ugcore.urging.ch. Default branch: `dev`.

The player HUD: status, needs, money, identity, voice, speedometer, compass, clock and weapon widgets, with a
drag-and-drop editor every player uses to make it their own. The HUD only shows. Needs, money, jobs and death state stay
on the server and arrive through ug-core events and statebags. Each player's layout is saved on their PC in client KVP
and parsed by the page as untrusted JSON, within the limits the owner set in `editor`.

## Skills

Task-specific guides live in `skills/<name>/SKILL.md`. Read the matching one before you start the task.

| Skill | Use it when |
| --- | --- |
| `skills/nui-page` | Adding or changing the NUI page, its messages and its callbacks. |
| `skills/config` | Adding an owner config option. |
| `skills/testing` | Writing Lua or web tests, adding a mock. |
| `skills/readme-preview` | Changing a screen or a feature owners notice: README features and images. |
| `skills/ug-core-api` | Looking up what ug-core and ug-lib offer: namespaces, enums, events, hooks, error codes. |

## Documentation

https://ugcore.urging.ch is the published documentation for ug-core, ug-lib and the official resources. Read the
page before using an API you have not used yet. Pages are `https://ugcore.urging.ch/<path>`:

| Topic | Paths |
| --- | --- |
| Start | `introduction`, `quickstart`, `architecture`, `concepts/security`, `concepts/death-system` |
| Building resources | `developers/importing`, `developers/callbacks`, `developers/net-events`, `developers/schemas`, `developers/events`, `developers/hooks`, `developers/lifecycle`, `developers/statebags`, `developers/modules`, `developers/versioning` |
| ug-core API | `api/overview`, then `api/<namespace>`: `players`, `players-death`, `player`, `localplayer`, `characters`, `accounts`, `jobs`, `gangs`, `permissions`, `permissions-groups`, `identity`, `sessions`, `commands`, `needs`, `items`, `inventory`, `inventory-client`, `inventory-containers`, `shops`, `shops-client`, `weapons`, `weapons-client`, `callback`, `network`, `schema`, `ratelimit`, `guard`, `hooks`, `events`, `lifecycle`, `config`, `modules`, `logger`, `locale`, `version`, `enums` |
| Reference | `reference/error-codes`, `reference/events`, `reference/hooks`, `reference/statebags`, `reference/config-files`, `reference/convars` |
| ug-lib | `ug-lib/introduction`, `ug-lib/importing`, `ug-lib/with-ugcore`, `ug-lib/security`, then `ug-lib/<component>`: `notify`, `textui`, `progress`, `skillcheck`, `dialog`, `context`, `menu`, `radial`, `keybind`, `zone`, `npc`, `entity`, `streaming`, `animation`, `cache`, `raycast`, `draw`, `locale`, `format`, `math`, `string`, `table`, `async` |
| Server owners | `owners/configuration`, `owners/modules`, `owners/permissions`, `owners/guard`, `owners/database`, `owners/console`, `owners/troubleshooting` |
| Contributing | `contributing/overview`, `contributing/conventions`, `contributing/testing` |
| Official resources, as examples | `ug-hud/*`, `ug-target/*` (`server-actions`, `security`), `ug-appearance/*` (`security`, `integration`), `ug-multicharacter/*` |

The source wins when the docs and the code differ. Clone `ug-core` and `ug-lib` next to this repository: they are
also what the type check and the tests read.

## Ecosystem

- **ug-core**: headless, server-authoritative framework core. Players, characters, accounts, jobs, gangs, permissions,
  sessions, death state, callbacks, net events, schema validation, rate limits, Guard (anticheat scoring). No UI.
- **ug-lib**: UI components (notify, text UI, progress, dialogs, menus, context, radial) and pure utilities. No network,
  no state.
- **This resource**: a feature resource. It uses both, and has its own NUI page.
- Runtime dependencies: OneSync, `ug-core` and `ug-lib`. Nothing else. The `needs` and `accounts` modules are optional.
- Never depend on `ox_lib`, `qb-core`, `es_extended` or any other framework. Compatibility layers are separate files
  that only export the foreign names.

Both are loaded through their imports in `fxmanifest.lua`:

```lua
shared_scripts {
    '@ug-core/import.lua', -- defines UgCore
    '@ug-lib/import.lua',  -- defines UgLib
    'shared/init.lua',     -- defines UgHud, MUST come right after the imports
}
```

`ugcore_version` and `uglib_version` in the manifest make the imports refuse to start against older versions.

## Layout

```text
fxmanifest.lua             script order matters: each file MAY use what the files above defined; boot.lua is last
shared/init.lua            the only global: UgHud, UgHud.Internal
shared/enums.lua           every magic value: widgets, presets, styles, NUI actions and callbacks
server/config.default.lua  the defaults, with comments for owners; copied to config.lua on the first start, never overwritten
server/config.lua          loads, sandboxes and validates config.lua, publishes it in GlobalState
server/boot.lua            loads config; the HUD runs on clients only
client/nui.lua             the page bridge: schema-checked callback bodies, rate budget, Nui.Theme
client/settings.lua        the player's settings in client KVP, at most 32 KB
client/statuses.lua        custom statuses other resources add, as exports
client/display.lua         when the HUD and the minimap show, and the game HUD parts ug-hud hides
client/vehicle.lua         gauges, fuel, seatbelt and cruise control
client/collect.lua         reads what the HUD shows and sends what changed
client/editor.lua          the layout editor: cursor, moving and styling widgets, saving
client/boot.lua            waits for the server config and ug-core, binds keys, starts sampling
locales/*.json             every player-facing text; the `page` group goes to the NUI page
web/                       React + Vite + Tailwind 3 HUD and editor, built to web/dist
tests/                     Lua 5.4 tests with native mocks, never shipped
.github/                   CI, release and repository checks
```

Split a file when it passes about 300 lines.

## Naming

| Thing | Style | Example |
| --- | --- | --- |
| Global | one, PascalCase | `UgHud` |
| Public function | export, PascalCase | `exports['ug-hud']:SetStatus('drunk', 40)` |
| Private code | `UgHud.Internal.<Ns>` | `UgHud.Internal.Statuses` |
| Local function | camelCase | `local function sample()` |
| Local constant | UPPER_SNAKE | `local STATE_KEY = 'ug-hud:Config'` |
| Data field, option key | camelCase | `minimapLift` |
| Files, folders | lowercase | `client/statuses.lua` |
| Statebag, GlobalState and KVP keys | `<resource>:<Key>` | `ug-hud:Config`, `ug-hud:Settings` |
| Exports | PascalCase | `exports['ug-hud']:AddStatus(name, options)` |

`ug-core:*` names belong to ug-core. Never emit, register or set them.

## Code style

- Every `.lua` file starts with the license header, then one blank line. Every `.ts`/`.tsx` under `web/src` too, as
  a `/* */` block. The repository check fails otherwise. Copy it from any existing file.
- Every Lua function has LuaLS annotations (`---@param`, `---@return`, `---@class`). They are not comments.
- Comments only where code needs clarification. Never narrate. Short sentences. RFC 2119 words for obligations.
- Namespaces are plain tables with a class. To define functions through a local, the local MUST be the class:

  ```lua
  ---@class UgHud.Internal.Statuses
  local Statuses = {}
  UgHud.Internal.Statuses = Statuses
  ```

- Magic values live in `UgHud.Enums` (`---@enum`). Error codes come from `UgCore.Enums.Errors`, violations from
  `UgCore.Enums.Violations`, lifecycle states from `UgCore.Enums.Lifecycle`. Never write the string literal.
- Multiple returns keep one type per slot: `ok, value, errorCode`, never `ok, valueOrMessage`.
- A Lua table with a named field (`name = value`, `[key] = value`) puts one field per line, with a trailing comma.
  A list of plain values MAY stay on one line while it fits in 120 characters. A table inside a one-line block MAY stay inline.
- Cache natives and globals in locals only in hot paths (per tick, per request, per item).
- Natives take unpacked vectors: `GetDistance(coords.x, coords.y, coords.z)`. ug-core enables FXv2 OAL.
- Never depend on `pairs` order. Sort when order matters.
- Lua: 4 spaces, CRLF, 160 columns. Web: 2 spaces. See `.editorconfig`.

## Security: every client is hostile

These are not optional. Reviewers reject code that breaks them.

1. **Clients send intent, never results.** ug-hud sends nothing to the server. If a feature ever needs the server, the
   client says what it wants and the server decides. Never accept prices, amounts, rewards, item counts, coordinates or identities
   from a client.
2. **Every server entry point has a schema and a rate limit.** Use `UgCore.Callback.Register` or
   `UgCore.Network.Register` with `schema = UgCore.Schema.Define({...})` and `rate = { max, per }`. Never call
   `RegisterNetEvent`, `RegisterServerEvent` or `TriggerServerEvent` yourself.
3. **Every input is bounded.** `String`, `Array` and `Map` rules MUST set `max`. Integers get `min` and `max`.
4. **Identity comes from `source` only.** Never read a player id or identifier from arguments.
5. **Positions are checked on the server** with `UgCore.Guard.IsNear(source, coords, maxDistance)`, plus a small margin.
6. **Report cheats** with `UgCore.Guard.Flag(source, UgCore.Enums.Violations.X, detail)`: `InvalidPayload` for
   requests a real client never sends, `OutOfRange` for distance. Guard scores and kicks.
7. **Never tell the client which check failed.** Reply with a generic error code (`no_permission`). Details go to the
   server log or to `Guard.Flag`.
8. **Claim state before you await.** Anything that yields (database, accounts) lets a second request in. Set the
   cooldown or lock first, undo it on failure. ug-hud has no server entry point today.
9. **Money and items go through ug-core.** `UgCore.Accounts.Add/Remove` write the ledger. Never keep your own balance.
10. **Statebags are set by the server only.**
11. **The NUI page is untrusted.** Any script in CEF can post to your NUI callbacks. `client/nui.lua` checks every body
    with a schema and rate limits callbacks. Saved layouts and share codes are untrusted: `web/src/lib/settings.ts`
    keeps known keys with bounded values and the owner's `editor` limits, and Lua stores at most 32 KB.
12. **Nothing server-only in `files {}`.** No `server/`, `config.lua`, `tests/`. The repository check fails otherwise.
13. **The page never builds HTML from strings** and calls `fetch` from `web/src/lib/nui.ts` only. `security.test.ts`
    fails otherwise. Production builds have a strict CSP (`vite.config.ts`).
14. **Config values replicate to every client** through GlobalState. Never put secrets (webhooks, keys) in it.
15. **Statuses from other resources are bounded.** `AddStatus` checks names, labels and values, and a status
    leaves with the resource that added it.

## Lifecycle and boot

- ug-core boots in stages. Wait for it before calling anything that needs players or modules:
  `UgCore.Lifecycle.Await(UgCore.Enums.Lifecycle.Ready, 60000)`.
- Optional ug-core modules (`accounts`, `characters`, `jobs`, `needs`, ...) MAY be disabled by the owner. Check with
  `UgCore.Modules.IsEnabled('accounts')` at boot and log one clear error, or adapt.
- The server loads config, then publishes it. Clients wait for `GlobalState['ug-hud:Config']`.
- Each side prints one line when ready: `[ug-hud] v1.0.0 ready.` on the server,
  `[ug-hud] Ready: neon, /hud to customize.` in F8. Config errors print one line each, then a summary.

## Player-facing text

Everything a player reads goes through `locales/<code>.json`. Lua uses `UgLib.Locale.Create()` and
`label('key', { var = value })`. The page gets the `page` group. Every locale has the same keys as `en.json` (tested).
Error codes have a text under `page.error.<code>` (tested). Placeholders are `{name}`.

## Verification

Every change MUST pass these before commit. CI runs them on pushes and pull requests to `dev` and `main`.
ug-core and ug-lib MUST be cloned next to this repository (`../ug-core`, `../ug-lib`), or set `UG_CORE` and `UG_LIB`.

```bash
# 1. LuaLS strict check, zero problems. Add ug-core, ug-lib and the CfxLua natives as workspace.library in your
#    editor or a CI-style config; .luarc.json MUST NOT set workspace.library.
lua-language-server --check . --checklevel=Information --configpath=.luarc.json

# 2. Lua tests
for suite in tests/*.lua; do [ "$suite" = tests/helpers.lua ] || lua5.4 "$suite" || exit 1; done

# 3. Manifest and license headers
lua5.4 .github/scripts/check-repository.lua

# 4. Web page (Node.js 20.19+)
cd web && npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run budget
```

Every change in behavior adds or extends a test. Tests cover behavior, not cosmetics.

## Git

- Conventional Commits. Lowercase imperative subject, no trailing period, 72 characters at most.
  Scopes: `core`, `api`, `editor`, `widgets`, `vehicle`, `statuses`, `nui`, `web`, `config`, `locale`, `ci`, `deps`.
  Add new ones to `.github/workflows/pr-title.yml`.
- Branch off `dev`: `<type>/<issue>-<short-description>`. Pull requests go to `dev`.
- Commit subjects become release notes. Write them for server owners.
- Breaking changes to exports, config or database are MAJOR: mark them with `!` or a `BREAKING CHANGE` footer.
- Never bump `version` by hand. release-please bumps it on `main` from the commits.
- `dev` reaches `main` through pull requests merged with a merge commit, never squashed.

## Never

- Define a global other than the resource's one.
- Register a raw net event, or trust anything a client or the page sends.
- Accept an unbounded string, array or map.
- Tell a client which security check failed.
- Write to `config.lua` except to generate it when missing.
- List server-only files in `files {}`.
- Depend on another framework or UI library.
- Commit with a failing check.
