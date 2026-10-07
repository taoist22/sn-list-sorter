# ListSorter 1.0.1-beta: Chauvet 3.29.43 compatibility audit

Historical audit of 1.0.1-beta. Its host-contract fixtures are archived as `.ts.txt`; release regression tests now cover the corrected behavior.

Audit date: 2026-09-11. User-reported failure: ListSorter is greyed out, cannot be selected, and shows no permissions.

**Verdict: the delivered package is not a complete permission-system migration.** It contains the upgraded SDK and permission calls, but omits their required manifest declarations. There is also a separate text-only lasso restriction. The missing declaration is confirmed; whether the reported disabled control is the lasso filter or the host's plugin enable control remains unresolved because the exact control/selection type has not been supplied.

This is an audit of the delivered version, not a replacement release. Production files and the existing installable package were preserved during this audit. Added files are the report, evidence, and audit reproduction tests.

## 1. Confirmed compatibility blocker: permissions were never declared

[PluginConfig.json](/Users/ctreatherford/supernote-plugins/sn-list-sorter/PluginConfig.json:1) contains no `uses-permissions`. The same omission is present in the manifest extracted from the actual `.snplg`.

Supernote requires a manifest declaration before requesting a permission. An undeclared request fails with code **1500**. The declaration must be added manually; packaging does not generate it. [Official permission specification](https://docs.supernote.com/en/plugin-base/permission), [official packaging requirements](https://docs.supernote.com/en/first-plugin#package-the-plugin).

The required addition is:

```json
"uses-permissions": [
  "plugin.permission.FILE:READ",
  "plugin.permission.FILE:WRITE"
]
```

ListSorter needs read access for selected/page text and write access for insertion and group edits. It does not need Internet or file-delete access. Element edits are file writes.

The permission helper calls the new APIs but cannot compensate for this omission. Its catch block suppresses the original failure and then says the user did not allow access. That misdiagnoses a packaging defect as a user decision. See [pluginPermissions.ts](/Users/ctreatherford/supernote-plugins/sn-list-sorter/src/pluginPermissions.ts:5).

**Fix:** declare both permissions in the source and packaged manifests, retain native error code/message in failures, and distinguish rejection/unsupported API/missing declaration from a returned denial status. Add an installed-version and permission-status screen.

**Evidence:** tests A01–A02. The error-1500 test models the documented host rule; it is not an Android execution trace.

## 2. Why the button can be unavailable before permission requests

The actual entry registers exactly one button: NOTE lasso, ID 200, `editDataTypes: [3]`. It has no sidebar or settings entry. See [index.js](/Users/ctreatherford/supernote-plugins/sn-list-sorter/index.js:13).

Supernote defines selection type `0` as handwriting and `3` as text. Its lasso entry is available only for matching selections. ListSorter therefore excludes raw handwriting. It only reads `getLassoText`; it does not call recognition itself. [Official button definition](https://docs.supernote.com/en/api-reference/supernote-plugin/types/plugin-button).

**Interpretation of the reported grey state:**

- If this is the lasso button while ink is selected, the text-only filter is a direct explanation. A permission dialog cannot be reached from that disabled entry.
- If recognized text alone is selected, the filter does not establish the cause. Registration result, enabled state, exact installed version, and host selection classification need to be observed.
- If the grey control is in system plugin management, the lasso filter does not explain it. The host also has an enabled-plugin limit of ten. This is a conditional diagnostic, not a claim that the user hit that limit. [Ratta announcement](https://www.reddit.com/r/Supernote_dev/comments/1w57c45/plugin_preview_build_chauvet_32944_beta_for_manta/).

There is no evidence that adding an undocumented `enable: true` field would solve this. The published button contract does not require it. Registration currently ignores the returned promise/boolean, and no `getButtonState` result is captured.

**Fix:** check and report initialization and button-registration results; provide a settings entry independent of selection. For the intended handwritten-list workflow, support selected strokes and recognize them, or make the recognized-text requirement explicit before the user encounters the disabled control. Merely widening the filter without adding recognition would expose another failure.

**Evidence:** A03 executes the actual index registration under a mocked host and checks its payload. Native UI enablement remains device-only evidence.

## 3. Chauvet 3.29.43 versus 3.29.44

The earlier response selected 3.29.44 as a requirement without explaining the relation to the user's firmware. Ratta describes 3.29.44 as fixing sticker loss in 3.29.43, with the rest of that release unchanged. Both belong to this permission-system transition. **The version-number difference does not excuse ListSorter's missing declarations.** [Official release announcement](https://www.reddit.com/r/Supernote_dev/comments/1w57c45/plugin_preview_build_chauvet_32944_beta_for_manta/).

Local evidence confirms SDK **0.1.65**, React Native **0.79.2**, the new lifecycle method, and permission calls are in the delivered bundle. `PluginManager.init()` is present; its SDK implementation reports the SDK version. These parts of the upgrade were real. There is no extra native dependency or project Android module in this plugin, so absence of `app.npk` is not itself a defect here.

## 4. Other functional defects and risks

| Priority | Finding and evidence | Proposed correction |
| --- | --- | --- |
| High | **Unnecessary page scans block ordinary sorting.** `detectLassoMode` calls `getElements` before reading selected text. A page-cache error 206 aborts a selection that `getLassoText` could otherwise read. [listOps.ts:106](/Users/ctreatherford/supernote-plugins/sn-list-sorter/src/listOps.ts:106), A04. | Determine the selected objects first. Use selected-element metadata to identify a group, and only scan the explicit current page when an actual group operation needs it. |
| High | **Native element handles are never released.** Page scans and newly created elements have no recycle/finally cleanup, including early returns and failures. A06. | Recycle owned handles after their last use, including error paths. Deduplicate by UUID first; release each unique handle once after all consumers finish. Do not release duplicate handles early if retained entries still need them. |
| High | **Wrong-group selection is possible.** Group detection uses rectangular overlap with every page element, rather than actual lasso membership. An unselected overlapping group takes precedence over selected ordinary text. It accepts any JSON `gid` without a plugin/schema namespace. A05. | Use selected element IDs and versioned, plugin-owned metadata; handle selections containing multiple groups explicitly. |
| High | **Insertion target can drift.** `LassoData` stores text and a rectangle, but not its file/page. Insertion fetches the current file/page again after the preview and permission awaits. If the context changes, text from one note can be inserted into another. [types.ts](/Users/ctreatherford/supernote-plugins/sn-list-sorter/src/types.ts:13), A16. | Capture file/page with the selection; verify that context immediately before committing. Abort clearly on a change. |
| High | **Oversized output is submitted outside page bounds.** Width is never constrained; the fallback only checks a 200-pixel allowance. Tall lists are moved to top margin but never made to fit. A09–A10 reproduce overflows on a 1404 × 1872 page. | Measure/wrap text, validate the complete layout against actual page dimensions, and offer smaller text or pagination when it cannot fit. Treat page-size API failure as an error rather than assuming Manta dimensions. |
| Medium | **Duplicates and incomplete writes look successful.** Duplicate UUIDs are edited twice; `success: true, result: []` from `modifyElements` still closes/reloads as if modification succeeded. A07/A12. | Deduplicate and compare returned modified element indices against the requested set. Surface partial/no-op results without encouraging duplicate insertion. |
| Medium | **Cold entry and lifecycle recovery are incomplete.** A launch without a button event spins forever. State 3 discards the current UI; state 2 does nothing, so stop/start without a new button leaves a spinner. Pending events are read but never consumed. Concurrent detection has no generation/cancellation guard. [App.tsx](/Users/ctreatherford/supernote-plugins/sn-list-sorter/App.tsx:17), A13/A17. | Explicit idle/setup, detecting, ready, working, error states; consume each entry event once; discard stale results; recover on resume. Whether permission dialogs generate these exact events needs device confirmation. |
| Medium | **Formatting fields conflict with user expectations.** Insertion sends `textEditable = 1`; SDK 0.1.65 documents 1 as non-editable and 0 as editable. It also sets auto-width on every box, which makes useful common-edge center/right alignment questionable. A08 proves the payload, not the renderer's response. | Leave unsupported editability fields at native defaults; use an intentional shared fixed width for column alignment. Confirm resulting editing/alignment on device. |
| Medium | **Realign and format overwrite box widths with 600 pixels.** That can change wrapping/clipping and push a group over the right edge. [listOps.ts](/Users/ctreatherford/supernote-plugins/sn-list-sorter/src/listOps.ts:267). | Preserve or recompute widths based on actual content, alignment, and page space. Validate the entire result before modifying. |
| Medium | **Failure UI has no recovery controls.** The error screen contains text but no Retry or Close. The same generic message is used for manifest/bridge failure and denial. | Add Close and a contextual retry/permission action; show operation, native error code, and version without exposing unnecessary note content. |
| Low | **Lettered lists break after Z.** The 27th item is `[. Item`, not `AA. Item`; preview duplicates the same algorithm. A11. | Share a base-26 lettering formatter between preview and insertion. |
| Low | **Group controls ignore stored formatting and output mode.** GroupPanel discards its data, defaults to 32/non-bold, and always offers Realign despite README saying it is only for individual items. [GroupPanel.tsx](/Users/ctreatherford/supernote-plugins/sn-list-sorter/src/GroupPanel.tsx:24). | Load current style and box count; show mixed styles honestly; hide irrelevant actions. |

Supernote confirms that reads/create operations allocate cached element handles, that write operations require those handles, and that missing handles can be silently skipped. This supports the cache-lifetime and write-result findings. [Official element-operation contract](https://docs.supernote.com/en/plugin-base/file-op/element-op). The editability field is documented in the installed [SDK source](/Users/ctreatherford/supernote-plugins/sn-list-sorter/node_modules/sn-plugin-lib/src/model/Element.ts:714).

## 5. Why previous verification missed the failure

- The prior tests replaced the whole SDK with success-returning mocks. No test loaded the manifest or modeled declaration enforcement.
- The old insertion fixture was just a `textBox` object without an element type. Executing the real SDK validator rejects that fixture with 107. A14 demonstrates that the mocks skipped even JS-side SDK validation.
- Startup and rendered App paths previously had no coverage. Calling `detectLassoMode` directly does not prove a user can activate the plugin.
- The standard validator checks strings and archive entry names. It does not enforce permission declarations, validate the packaged manifest against actual calls, or require the JS bundle for a non-native package. It still accepts this defective package today. [Validator](/Users/ctreatherford/supernote-plugins/sn-list-sorter/tools/validate-plugin-package.js:29).
- Earlier typecheck, lint, tests, and zip checks therefore proved limited properties. Presenting their success as firmware compliance was incorrect.

**Required release checks:** source and packaged manifests declare the required permission set; the packaged bundle and metadata agree; real SDK JS validation runs with realistic element fixtures; startup/button/permission/lifecycle tests run; native error codes survive to diagnostics. Keep native bridge tests separate from real-device evidence.

## 6. Recommended implementation order and improvements

1. **Restore access:** declarations, checked registration, independent settings entry, meaningful error reporting, and a visible version label. Validate this first on the user's actual entry/selection.
2. **Make operations safe:** selected-object group detection, cache cleanup/deduplication, captured context, complete write-result checks, bounds checks, and lifecycle recovery.
3. **Make handwriting practical:** selected-stroke recognition with editable preview and cancellation. The SDK exposes `recognizeElements` for strokes/text boxes; use the current page size and release handles after recognition. This should not delete the original handwriting. [Official recognition API](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-comm-api/recognize-elements).
4. **Improve sorting:** A–Z/Z–A and natural numeric sort, optional removal of existing bullets/number prefixes, optional duplicate removal, and shared lettering after Z. Preserve duplicates unless the user requests removal.
5. **Improve layout:** preserve existing group style, shared column widths, accurate preview, and explicit overflow choices. Consider current-page insert/modify APIs to reduce save/reload disruption, but verify undo semantics before promising one-step undo.

## 7. Evidence, reproduction, and acceptance

Inspected artifact: `build/outputs/ListSorter.snplg`, **277,920 bytes**, manifest version **1.0.1-beta**, versionCode **2**, pluginID **m4r7x2p9nk1w8czq**.

SHA-256: `b6a4cf6280e5088bf09002f240c7efe21b03456c07dbf2cba3b9f12afe1aec18`.

Zip integrity passes. The bundle includes SDK 0.1.65, permission methods, lifecycle registration, and the text-only lasso filter. Neither source nor packaged manifest has `uses-permissions`.

Run the audit suite from this project:

```sh
node node_modules/jest/bin/jest.js --config audit/jest.config.js --runInBand --watchman=false
```

**17 audit assertions pass, reproducing current defects/contract gaps. They are not acceptance tests declaring the plugin fixed.** The SDK-validator tests execute SDK 0.1.65 JS with its Android bridge substituted. Other cases use explicit simulated host responses. TypeScript and lint also pass after adding the audit files. No physical-device execution occurred.

The next device acceptance run must identify whether the grey control is the system plugin toggle or lasso button; test recognized text versus handwriting; verify declared permissions and first-use/denied/allow-once/always-allow paths; insert both output modes; realign and format a saved group; repeat on a handwriting-heavy page; reopen after close; and verify oversized-list handling. Do not declare the next release compliant solely because local checks pass.
