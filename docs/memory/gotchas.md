# SOLDI (soldify) — Gotchas (env & tooling traps)

> Durable traps and the fix, in-repo so a fresh session greps them instead of rediscovering.
> Harvested from machine-local claude-mem + `.planning`. Each entry: **what breaks → why → fix → status**.

## Android emulator dev-client (WSL2 → Windows)

### Use `--lan`, NOT `adb reverse`  `[RULE, verified 2026-05-27]`
- **Breaks:** `adb reverse tcp:8081 tcp:8081` through the WSL→Windows `ADB_SERVER_SOCKET` bridge tunnels the emulator port to the **Windows host**:8081, NOT the **WSL2 host** where Metro runs. TCP connects then closes → dev-client reports `java.io.IOException: unexpected end of stream` / `EOFException: \n not found`.
- **Working path:**
  ```bash
  cd apps/mobile && npx expo start --dev-client --lan
  WSL_IP=$(hostname -I | awk '{print $1}')          # e.g. 172.24.26.23
  adb shell ping -c 2 "$WSL_IP"                       # ~100ms through Windows NAT
  /home/iskan/platform-tools/win-emu-up.sh soldify
  ENCODED=$(printf 'http://%s:8081' "$WSL_IP" | jq -rR @uri)
  adb -s emulator-5554 shell am start -a android.intent.action.VIEW \
    -d "exp+soldi://expo-development-client/?url=${ENCODED}"
  ```
- **Scheme is `soldi`** (per `apps/mobile/app.json`), NOT `soldify`.
- `--tunnel` is NOT needed — emulator and WSL2 share the same Windows host; `--lan` suffices.

### `ADB_SERVER_SOCKET` host = default-route gateway  `[verified 2026-05-27]`
- **Breaks:** using the resolv.conf nameserver IP → `cannot connect to daemon: Connection refused` even though Windows shows the server listening on `0.0.0.0:5037`.
- **Fix:** derive from the default route, NOT DNS:
  ```bash
  ip route | awk '/default/{print $3}'   # RIGHT  → 172.24.16.1 (Windows host)
  # WRONG: awk '/^nameserver/{print $2}' /etc/resolv.conf  → 10.255.255.254
  ```
- The Windows side must run `adb -a -P 5037 nodaemon server` (all interfaces) so the WSL2 NAT gateway can reach it. `win-emu-up.sh` and `mobile-mcp-wsl.sh` already do this; bypassing them gives the localhost-only auto-spawned server → WSL sees no devices.

### mobile-mcp `list_crashes` quirk
- Through the WSL→Windows bridge `mobile_list_crashes` errors with `device not found: emulator-5554`. Fall back to:
  ```bash
  adb -s emulator-5554 logcat -d | grep -iE "(FATAL|ANR|AndroidRuntime.*soldi|hermes.*fatal)"
  ```

## CI / verification

### jest harness never set up → CI `npm test` is broken  `[P1, pre-existing]`
- `apps/mobile` has `.test.ts` files (Phase 1/2/3) but NO `jest`/`jest-expo` devDep, no `jest.config.*`, no `test` script. CI `ci.yml` step `npm test` fails `Missing script: test` independent of any feature work.
- **Do NOT claim "tests pass."** Verification rests on `npx tsc --noEmit` (exit 0) + `npx expo lint` (exit 0) only. A dedicated jest-harness task is deferred (user, 2026-05-15).

### expo-dev-client version must match SDK 54  `[2026-05-23, root cause of TF#7 build fail]`
- **Breaks:** `expo-dev-client ^56.x` (wrong major) pulls `expo-updates-interface@56` etc., collides with `expo-updates@29`'s nested copy → CocoaPods `Unable to find a specification for EXUpdatesInterface`.
- **Fix:** pin `expo-dev-client → ~6.0.21` for SDK 54. Keep a single lockfile (`bun.lock`) — dual lockfiles (`+package-lock.json`) violate the bun-only policy and confuse EAS package-manager inference. Run `expo-doctor` (must be 18/18).

## iOS native

### iOS-26 Liquid Glass crash gate  `[2026-05-24, fix ff48ab2]`
- **Breaks:** `expo-glass-effect@0.1.x` (beta) weak-links iOS-26-only symbols. Pre-iOS-26 iPhones calling `isGlassEffectAPIAvailable()` / `isLiquidGlassAvailable()` in `GlassTabBar` or `BottomSheetPrimitive` crash (EXC_BAD_ACCESS) BEFORE the guard can evaluate. Surfaced as TF#8 cold-start crash on testers' iOS 17/18 devices.
- **Fix:** `src/lib/glassEffect.ts` lazy-requires `expo-glass-effect` ONLY when `Platform.OS==='ios' && parseIOSMajor(Platform.Version)>=26`, returns null otherwise. `GlassTabBar` + `BottomSheetPrimitive` read through `getGlassEffect()` and force the solid fallback when null — pre-iOS-26 + Android never touch the native binding.
- **Status:** commit `ff48ab2` was NOT YET PUSHED as of 2026-05-24 (direct-to-main was classifier-denied, awaiting user OK). Verify it landed before treating the crash as fixed.

### Sentry token is write-only (can't read crashes)  `[2026-05-24]`
- The `sntrys_` auth token (org `lumina-fo`, DE region) is project-write only — no `event:read`. `/api/0/organizations/lumina-fo/projects/` returns HTTP 403. Crash triage works from device logs + hypotheses, not Sentry queries, until the token is upgraded with `event:read`.
