# Health diagnostics

Disabled in this build: the reported HP loss was traced by the user to their
ability's self-debuff. Restart the client manually to stop health capture.
The source-only `labHealthTelemetryEnabled_` flag is false; HP/condition tracking,
nearby-player scans and health log writes return immediately. Connection logs
remain enabled. Existing logs are preserved. The format below documents prior
captures and remains usable if diagnostics are deliberately re-enabled later.
Records share the existing `Local Store/lab-network-<session>.jsonl` file under
each profile's AIR application storage directory. `time` is epoch milliseconds;
`ms` is the client's monotonic timer. Parse `detail` as JSON for health events.

- `hp_baseline`: first authoritative HP observation for a player object.
- `hp_update`: changed authoritative HP, previous/next/delta and local HP before application. Positive deltas include healing. Unchanged HP is not logged.
- `server_damage`: Damage packet targeted at this player, before native handling.
- `local_hit_report`: outgoing native PlayerHit report (not proof of server acceptance).
- `ground_damage_report`: outgoing ground damage report.
- `aoe_hit`: native AoE intersection with raw and defense-adjusted damage.
- `condition_baseline` / `condition_update`: authoritative condition bank received from server, with bank index and previous/next masks. Baselines reset per player object; unchanged masks are omitted.

Version 2 health records also include both local condition masks (`conditions`).
Decode with `node decode-conditions.js <bank0> <bank1>`; it reads the current
client's constants, including Bleeding, Poison, Toxic and Toxin. These are flags,
not remaining durations or proof of a damage source. Both HP and condition
records capture local state BEFORE their respective stat is applied. Stats in
one update can arrive in either order, so inspect adjacent condition events too.

Each includes local HP/maxHP, position, living loaded players within 15 tiles
(including hidden players/followers), master toggle, Always/alone toggles,
threshold and `policyActive`. This is an uncached policy snapshot, not proof that
a particular projectile was suppressed: collision proximity is cached up to
100ms. HP update snapshots describe the state BEFORE applying the new HP.

Correlate events within the same profile/session/map. Do not sum Damage packets
and HP deltas: they may describe the same hit. HP deltas are net changes and can
include regeneration or other effects; proximity in time does not establish
causation. Unexplained HP changes remain unknown, not automatically server hits.
Only these explicit fields are recorded; no credentials or packet dumps.
No per-projectile polling, capture of other players' identities, or automatic
deletion/rotation is added; logs accumulate using the existing session files.
