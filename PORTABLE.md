# Evershade Cheat Client — Windows x64 portable

Extract the entire ZIP, open Evershade-Portable and double-click Evershade.exe.
Do not run from inside the ZIP. Sign in with your own account. No AIR SDK, AIR
installation, Git, Node.js or JPEXS is required by players.

Configure cheats in Options > Lab. GitHub and release links are under Project.
Godmode-style hit reduction does NOT prevent all damage. Cheats may violate
server rules. No promise of invulnerability, undetectability or compatibility
with future server updates.

This package targets the Evershade 2.1.17 hotfix protocol. It uses its own stable
AIR ID, Evershade.Community; settings and saved login are stored in that app's
AppData namespace. No accounts or saved state are included. It will not import
your old client settings automatically. 'Portable' means no installer, not that
settings are stored next to the EXE.

For updates, download a complete matching new portable release and extract it
to a new folder. Close the previous client normally first. Do NOT replace only
the SWF inside this bundle: AIR validates the packaged application. Do not change
the AIR ID to migrate settings or copy encrypted login stores between IDs.

This community build is not Authenticode-signed by a trusted Windows publisher.
Windows may warn about an unknown publisher. Verify the release source and its
SHA-256; do not disable Windows security protections globally.

The HARMAN AIR runtime is included by AIR's bundle packaging tool. Its branding,
license metadata and notices remain intact. A HARMAN splash may appear with the
free-tier SDK. AIR is not an endorsement of this client. Maintainers must comply
with their applicable SDK tier and terms; the SDK itself is not redistributed.

Project and downloads: https://github.com/mateogon/evershade-client-mods
AIR distribution terms: https://airsdk.harman.com/assets/pdfs/HARMAN%20AIR%20SDK%20License%20Agreement.pdf
