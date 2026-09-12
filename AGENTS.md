# Evershade Cheat Client: agent and contributor guide

Canonical maintenance instructions for Codex, Claude Code and other agents.
Read README.md for the feature set. Keep this guide independent of any one model.

## Boundaries

- Implement the requested change, not unrelated cheats or another server's port.
- Never publish accounts, character names, credentials, ELS stores, presets,
  AppData backups, gameplay logs or personal paths. Public names are placeholders:
  `LeaderPlayer`, `FollowerOne`, `FollowerTwo`.
- Never restart/close a live client, reset settings, rename AIR IDs or migrate
  login stores without explicit permission. A build is not permission to restart.
- Preserve user edits, including ignored sources. No destructive Git resets,
  broad deletion or automatic AppData restore. Check exact paths before acting.
- Keep health/debuff telemetry disabled unless requested; connection logging is
  separate. See HEALTH-TELEMETRY.md. Do not infer damage causes from timing alone.
- Prefer small changes using native game methods and focused runnable tests.
  Do not add a replacement build system or dependencies unnecessarily.
- Do not claim complete invulnerability, undetectability or live compatibility
  from source tests. Do not change AIR licensing or blindly bypass a rejection.

## Sources of truth

| Path | Purpose |
| --- | --- |
| `patches/client.patch` | Tracked public changes to six classes. |
| `patches/baseline.json` | Exact original SWF hash, version, decompiler version and class list. |
| `src-decompiled/scripts/` | Ignored original source export. Do not edit as a mod. |
| `src-mod/` | Ignored complete modified classes. Edit here, then regenerate the public patch. |
| `backup/Evershade.original.swf` | Ignored original build input / merge baseline. |
| `build/Evershade.mod.swf` | Compiled output; ignored. |
| `app/` | Complete local package; build replaces its SWF. Ignored. |
| `profiles/` | Generic AIR descriptors. IDs determine native login/settings namespaces. |
| `test-*.js` | Source-level checks with native API stubs, not live-server tests. |
| `build/network-probe/` | Tracked source and descriptor; generated binaries ignored. |
| `drops/` | Explorer UI; generated catalog data ignored. |

Fresh clones do not have `src-mod`. Precompiled-only installations are not ready
for source updates. Never use another lab/server's SWF as the base. Prefer graph
code discovery when available; if AS3 is unsupported, use `rg` on local sources.

### Feature locations after setup

- `src-mod/com/company/assembleegameclient/game/MapUserInput.as`: aim, abilities,
  loot, follow, identity guards and portal/command coordination.
- `src-mod/com/company/assembleegameclient/objects/Projectile.as`: local hit
  reduction and proximity detection, not server/AoE damage.
- `src-mod/com/company/assembleegameclient/parameters/Parameters.as`: defaults.
- `src-mod/com/company/assembleegameclient/ui/options/registry/OptionRegistry.as`:
  Lab UI controls. This version does not use the older client's Options.as.
- `src-mod/kabam/rotmg/messaging/impl/GameServerConnection.as`: messaging, item use,
  connection diagnostics and disabled health logging.
- `src-mod/Evershade.as`: window layout and narrowly scoped runtime-error handling.

Inspect callers and native counterparts before modifying a method. Packet fields,
condition bit layouts and forge/item semantics vary between servers. Do not
transplant an old server's handshake/signature fields into this client.

## Source setup

Requirements: Windows PowerShell, Git, Node.js, JPEXS FFDec **26.2.1**, AIR SDK
**51.3.4** (descriptor namespace 51.3), and an authorized original ZIP matching
`patches/baseline.json`. SDK license acceptance belongs to the user.

```powershell
$env:AIR_HOME = 'C:\Tools\AIRSDK'
$env:FFDEC_HOME = 'C:\Tools\ffdec'
.\setup-client.ps1 -Zip 'C:\Downloads\Evershade.zip'
```

Setup refuses existing app/source folders. It verifies the hash, exports sources,
applies patches, runs tests and the offline AIR probe, compiles and extracts the
catalog. On failure, fix the cause and retry in a fresh clone; do not delete the
user's working lab. A wrong hash requires a reviewed port, not removal of the check.

## Modify, test, compile and run

1. Inspect Git status, original hash, local customizations and running clients.
2. Back up affected ignored source files and the working SWF to a timestamped
   ignored directory. Git cannot recover ignored edits.
3. Edit `src-mod`. Update defaults, UI and help together when needed. Preserve
   saved choices. Add/update the focused behavioral test.
4. Run from the repo root with AIR_HOME and FFDEC_HOME set:

```powershell
Get-ChildItem test-*.js | ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Failed: $($_.Name)" }
}
.\test-network-air.ps1
.\build-mod.ps1
Get-FileHash .\build\Evershade.mod.swf
```

Build imports `src-mod` into the original SWF through JPEXS, then copies to
`app/Evershade.swf` only after successful compilation. Do not edit sources while
import is running. A running client keeps its old code. Report tests and any
pending live verification. Launch/restart only when authorized:

```powershell
.\launch-mod.ps1
.\launch-mod.ps1 -Profile LeaderPlayer
.\launch-clients.ps1
```

These are alternatives, not a command sequence to launch the same account twice.
Use normal UI login; never embed credentials. ADL startup does not prove login or
working gameplay. The captive EXE may reject modified packages.

### Known compiler trap

JPEXS emitted invalid AVM2 for nested `catch` inside `finally`, producing
`VerifyError #1030: Stack depth is unbalanced`. Keep FileStream cleanup outside
`finally`, as the logger does. When changing `labNetworkLog`, update the exact
method in NetworkProbe too, and run `test-network-range.js` plus
`test-network-air.ps1`. Never hide a verifier error with broad suppression.

## Updating the game

1. Confirm old original SWF, old original export and current mods form a consistent
   baseline. Preserve profile IDs. If fresh saved settings are needed, ask the
   user to close clients normally; do not kill them.
2. Prepare without installing:

```powershell
.\update-client.ps1 -Zip 'C:\Downloads\Evershade-new.zip'
```

3. Review `build/update-*/upstream-diff.txt`, merged sources and logs. Merge roles:
   ours=current mods, base=old original sources, theirs=new original sources.
   Review native/protocol changes even when the merge is clean.
4. Conflicts, missing classes, changed AIR identity or failed checks stop the
   update. Resolve through a reviewed port, not bypassing checks. A rerun creates
   a new stage; edits to an old stage are NOT automatically reused.
5. If preview is clean and installation is authorized:

```powershell
.\update-client.ps1 -Zip 'C:\Downloads\Evershade-new.zip' -Apply
```

Apply prepares again. The updater backs up package, sources, scripts, descriptors
and sensitive SharedObjects/ELS snapshots. It installs new package/source/catalog
files and updates the original merge baseline, copying the SWF last. It does not
restore or write AppData. Never publish the backup, even if logins are encrypted.

Deployment is not transactional. On mid-copy failure, report the stage and backup.
With approval and clients closed, restore app, original SWF, `src-decompiled` and
`src-mod` from the SAME backup. Do not mix bases or restore AppData by default.
Validate live compatibility after an approved restart.

The updater does not regenerate public patches or the baseline manifest. Use the
publication workflow below. Pulling Git updates also does not automatically
reapply public patch changes to an existing ignored `src-mod` directory.

## Local profile customization

Following uses explicit character names, AIR IDs and LocalConnection destinations.
For an explicitly requested local setup, replace the three placeholder names
consistently in `src-mod`, profile XML filenames/contents, launch scripts, updater
profile list and test fixtures. Rebuild. Keep personalized changes and SWFs private.

Changing AIR IDs changes login/settings namespaces. Do not assume ELS portability
or copy accounts between profiles. A name mismatch intentionally pauses automation;
do not remove that guard to disguise a mistaken login.

## Refresh patches and publish

### Portable release packaging

After compiling sanitized public sources, run `package-portable.ps1` with AIR_HOME
set. It passes an explicit SWF/icon allowlist to ADT `-target bundle -arch x64` and
creates a ZIP under a timestamped ignored build directory. Do not copy an existing
runtime/app folder or ship ADL/the SDK as a shortcut. Runtime redistribution must
follow the applicable HARMAN SDK license/tier; retain generated notices/metadata.

`portable.xml` uses stable ID `Evershade.Community` and controls the portable release
version. This intentionally differs from the original and named development
profiles. Keep it stable across portable updates. The script reuses a self-signed
AIR certificate and DPAPI-protected password under `build/portable-signing`.
Back up that private signing store securely; never publish it. It is not Windows
Authenticode signing. Do not silently rotate its identity when files are missing.

Test a freshly extracted ZIP, without AIR_HOME/FFDEC_HOME or SDK directories in
its process PATH, and inspect the loaded runtime path. Verify startup and Options
links separately from live account login; do not automate credentials. Use only
the isolated test process, not the user's existing clients. The package must not
include AppData, settings, logs, profiles or signing materials. Verify archive
contents and decompressed SWF identifiers before upload. Publish a NEW release,
leaving prior assets intact; include hashes and exact supported server version.

Users update by extracting a complete new bundle. Replacing a bundled SWF alone
invalidates package integrity. Maintain PORTABLE.md and README quick-start text.

### Public source patches

Ignored `src-mod` edits are not delivered by committing only tests or documentation.
Use a separate anonymized build for publication:

1. Match the intended original export and sanitize modified sources back to generic
   profiles. Do not export from another person's saved app directory.
2. For each changed class, generate a unified diff:
   `git diff --no-index --no-ext-diff --text -- <original-class> <modified-class>`.
   Exit 1 means differences. Rewrite headers to relative `a/<class-path>` and
   `b/<class-path>` paths, concatenate into `patches/client.patch`, and keep context
   intact. Do not include personal absolute paths.
3. If the original changed, update `patches/baseline.json`: actual ORIGINAL SWF
   SHA-256, version, FFDec version and class list. Never use a modified SWF hash.
4. Validate a fresh checkout with the exact original ZIP through setup: patch
   application, tests, offline AIR probe, compilation. Update compatibility docs.
5. Review the entire staged diff and run `node check-public.js`. It checks STAGED
   files and is not a complete secret scanner. Search known personal identifiers
   too. Never force-add ignored sources, backups, catalogs or runtime data. Use a
   public-safe Git author identity.
6. Publish only when asked. For releases, compile sanitized sources, scan the
   decompressed SWF for personal identifiers, upload only the intended asset,
   include baseline compatibility and SHA-256, and verify the remote asset digest.

Keep existing release tags/assets immutable unless replacement is requested.
Documentation changes do not require recompiling/replacing the release SWF.
Report changes, checks, limitations and whether a restart is required.
