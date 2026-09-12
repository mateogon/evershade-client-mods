# Evershade client mods

Experimental ActionScript patches, launch tools and a local drop explorer for
the Flash/AIR Evershade client. This is not a complete game distribution or a server.
Use only where the server operator permits client modifications; automation can
violate server rules. No feature guarantees survival or server compatibility.

## What is included

- A **Lab** options tab with automatic/cone aiming, manual mouse override,
  pre-shooting, targeted manual abilities and an automatic ability mode.
- Nearby auto-loot with basic equipment tier filters, potion handling, storage
  capacity checks and retry backoff. It does not walk to bags.
- Optional auto-nexus and local projectile-hit reduction. The latter does **not**
  prevent server damage, terrain, AoE, ability costs or self-debuff damage.
- Three-profile launcher/grid placement, follower movement, native teleport
  requests and conservative portal following. These use placeholder names;
  configuring real accounts is a local-only advanced step described below.
- Offline searchable monster/drop catalog generated from your own client.
- Connection diagnostics. HP/damage/debuff capture is **disabled**.

No accounts, passwords, login stores, user presets, gameplay logs, decompiled
base sources or SDKs are supplied. Git contains patches and tools; GitHub Releases
also provide a precompiled modified SWF. You supply an authorized matching game
package and runtime. Third-party
game code and assets remain their owners' property; no license to those is granted.

## Quick start with the precompiled SWF

Download **Evershade.swf** from [Releases](https://github.com/mateogon/evershade-client-mods/releases).
This skips compilation: you need Windows PowerShell and the AIR SDK, but not
Node.js or JPEXS just to run it. Download this repository as a ZIP if you do not
want to install Git either.

1. Extract the matching original **2.1.17 hotfix** game package separately.
   Verify its original `Evershade.swf` hash against the baseline below.
2. Copy the contents of the game directory into this repository's `app/` folder,
   preserving `META-INF/AIR/application.xml` and the rest of the package.
3. Keep a backup of the original SWF outside `app/`. Replace `app/Evershade.swf`
   with the release download, after verifying the release SHA-256.
4. Set your SDK location and launch:

```powershell
$env:AIR_HOME = 'C:\Tools\AIRSDK'
.\launch-mod.ps1
```

The release uses generic profile names, has health telemetry disabled, and does
not include anyone's account or saved settings. Sign in normally. Do not launch
the modified package with its captive EXE; use the ADL launcher above.

**Updates:** this quick path does not create the decompiled merge baseline needed
by `update-client.ps1`. Use a matching future prebuilt release, or initialize a
separate source checkout using the full setup below before using the updater.
Do not apply this SWF to arbitrary newer game packages.

## Requirements for building and automatic updates

Windows PowerShell, Git, Node.js, JPEXS FFDec **26.2.1**, and an AIR SDK compatible
with application namespace **51.3** (tested with **51.3.4**).

- [JPEXS FFDec](https://github.com/jindrapetrik/jpexs-decompiler)
- [HARMAN AIR SDK](https://airsdk.harman.com/download) — accept its terms yourself.

Initial setup requires **Evershade 2.1.17 hotfix**, with SWF SHA-256:

```text
1DE66DA6D8A930B1D0E55FCA80FF82BD695354A7BDFBB2D862D511BEDAF5F8BC
```

The version label alone is insufficient: two releases can share it. Setup checks
the hash and fails on mismatches. If you only have a newer release, these patches
need a reviewed port; the first setup is not an automatic arbitrary-version port.

## First setup and launch

Clone this repository, open PowerShell in its directory, and set tool locations:

```powershell
git clone https://github.com/mateogon/evershade-client-mods.git
cd evershade-client-mods
$env:AIR_HOME = 'C:\Tools\AIRSDK'
$env:FFDEC_HOME = 'C:\Tools\ffdec'
.\setup-client.ps1 -Zip 'C:\Downloads\Evershade.zip'
.\launch-mod.ps1
```

Set those environment variables again in new shells, or configure them locally.
If PowerShell blocks scripts, review them first and use a process-scoped policy
consistent with your organization's rules; do not disable machine-wide security.

Setup extracts and checks your ZIP, decompiles the original, applies six class
patches, runs regression checks plus an offline AIR logger probe, compiles the
modified SWF and generates the drop catalog. A failed setup can leave local
intermediates: retry in a fresh clone after fixing the problem. It never imports
accounts or launches the game automatically.

Launch uses the official SDK's **ADL** with the game's AIR descriptor. Running the
modified package through its captive executable may produce an invalid-license
warning. This project does not patch AIR licensing.

Log in normally using your own account. Open **Options → Lab** to configure the
features; auto-aim, auto-loot, follow, auto-nexus and hit reduction default OFF.
Existing native settings may override defaults. Save presets through the game's
normal settings interface. Holding the fire mouse button overrides auto-aim.

```powershell
.\open-drops.ps1     # Generate/open the local monster drop explorer
.\build-mod.ps1      # Recompile after editing local src-mod/*.as
```

Restart manually after replacing a SWF; an open client keeps its loaded code.
Neither build nor update scripts close your clients.

## Updating the game without losing settings

Once setup works, keep the lab directory: its original SWF and decompiled sources
are the merge baseline. Download a new official game ZIP separately. Close game
windows normally first if you want their latest settings saved.

```powershell
# Prepare, back up, merge and test without installing:
.\update-client.ps1 -Zip 'C:\Downloads\Evershade-new.zip'

# Review build/update-*/upstream-diff.txt, logs and staged sources, then install:
.\update-client.ps1 -Zip 'C:\Downloads\Evershade-new.zip' -Apply
.\launch-mod.ps1
```

`-Apply` repeats preparation; it does not deploy the previous preview directory.
The updater performs a native Git three-way merge: old original + local mods +
new original. Missing classes, conflicts, changed AIR identity, failed tests or
failed compilation stop installation. A clean merge is not a semantic guarantee:
protocol or game behavior changes still need review and a live login test.

Backups include the app, source baseline, mods, descriptors, scripts and local
SharedObjects/ELS snapshots. **Those backups contain sensitive account data**:
never upload or share them. The updater does not overwrite AppData, restore ELS,
or change profile IDs. Retaining the same AIR ID retains the same local settings
and login namespace; renaming it looks like a fresh installation.

The SWF is copied last, but deployment is not a filesystem transaction. If an
installation fails during copying, close the game and restore the app, original
SWF and both source directories from the same backup. Do not mix baselines or
copy encrypted login stores between different profile IDs.

Updating this Git repository is separate from updating the game. Back up local
customizations before pulling repository changes. Repository patch changes are
not automatically reapplied to an already initialized `src-mod`; review and port
them, or test a fresh clone with the supported baseline.

## Optional multi-client setup (advanced, local only)

The public examples use **LeaderPlayer**, **FollowerOne**, **FollowerTwo**. These
are placeholders, not accounts. Single-client `launch-mod.ps1` needs no changes.

For following, consistently replace these three names with your in-game character
names in local `src-mod`, profile XML contents/filenames, `launch-mod.ps1`,
`launch-clients.ps1`, `update-client.ps1` and the test fixtures. Rebuild and launch:

```powershell
.\launch-clients.ps1
# Or one configured profile:
.\launch-mod.ps1 -Profile LeaderPlayer
```

Use the replacement name in the final command after customization. Keep these
edits local and never commit actual account names. No passwords belong in code.
Each AIR profile has its own native login/settings storage. Sign in once per
profile; saved-login reuse depends on the game's native behavior and valid
credentials. This does not automatically select a character or press Play.

Followers must match their profile names; mismatches pause automation. Enable
Follow and optionally Follow portals on followers. Default hotkeys: comma toggles
follow; period on the leader requests follower teleports, subject to native
cooldown/map rules. Keys are rebindable and ignored while typing. Grid arrangement
keeps window sizes; smaller screens may overlap. Following is conservative direct
movement, not general obstacle pathfinding, and portal transitions can time out.

## Tests and diagnostics

After setup, from the repository directory:

```powershell
Get-ChildItem test-*.js | ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Failed: $($_.Name)" }
}
.\test-network-air.ps1
```

Source-level tests use native API stubs; they do not prove live-server behavior.
The separate AIR probe tests the imported logger bytecode without game login.
Startup logs live in ignored `logs/`. Native connection logs live under the AIR
profile's AppData `Local Store`. Do not attach raw logs without checking them for
private data. See [health diagnostics](HEALTH-TELEMETRY.md) for the disabled capture.

## Publishing changes safely

The public repository intentionally excludes `app/`, `backup/`, `src-decompiled/`,
`src-mod/`, generated drop data, binaries and runtime output. Publish reviewed,
anonymized changes in `patches/client.patch`, not your entire working folder.
`.gitignore` does not sanitize tracked edits: inspect the staged diff and run
`node check-public.js` before every push. Never force-add private directories.
