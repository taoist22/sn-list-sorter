https://github.com/user-attachments/assets/db8c640f-46e3-4d78-ac34-29e8efda3315

# ListSorter 1.1.0-beta

Sort selected handwriting or typed text in a Supernote note. Review the recognized lines, choose sorting and formatting options, and insert a new list. The original selection stays on the page.

## Firmware and permissions

Targets the permission APIs introduced in **Chauvet 3.29.43 beta** (Manta/Nomad) and **2.26.40 beta** (A5 X/A6 X), also present in the replacement **3.29.44 / 2.26.41** builds. Ratta replaced the earlier builds to fix sticker loss; this plugin does not require that earlier firmware to be installed.

Built with `sn-plugin-lib` **0.1.65** and React Native **0.79.2**. The manifest declares only `plugin.permission.FILE:READ` and `plugin.permission.FILE:WRITE`. Read access is required for selections; write access is requested for insertion, group editing, and saving the note to read a group accurately. No network or file-delete permission is requested.

Local tests use the actual SDK JavaScript with a simulated Android bridge. Recognition quality, native rendering, selection availability, and permission dialogs still require testing on a device.

## Open ListSorter

- **Lasso:** select handwriting, text boxes, or both in a NOTE; tap **Sort List**.
- **Note toolbar:** open **ListSorter** to see version, permissions, registration status, and the current lasso button state.
- **Plugin settings entry:** opens the same setup screen without needing a selection.

If the lasso button is unavailable, open the setup entry and check its status. Unsupported selection types (images, links, shapes) are not sortable.

## Sort and insert

1. Lasso the list. Handwriting is recognized directly; converting with the device's **Recognize as Text** beforehand is also supported.
2. Review and edit the lines. Each nonempty line becomes one item.
3. Choose A–Z or Z–A. **Natural numbers** orders Item 2 before Item 10. Optional controls remove existing prefixes or exact duplicate items; both are off by default.
4. Choose plain, bulleted, checkbox, numbered, or lettered output; lettering continues through AA, AB, and beyond. Choose font size, bold, and alignment.
5. Choose a single multiline box or individual boxes. Individual items can later be realigned.
6. Inspect the wrapped text and page-position preview, then tap **Insert sorted list**.

The layout tries space below, beside, or above the original selection. It wraps long lines with explicit breaks and uses shared fixed box widths. **Fit to space** may reduce text down to 16 px; the preview shows the chosen size. If no layout fits, insertion is disabled: use fewer items or shorten the text. No new pages are created automatically. Glyph spacing is estimated conservatively; the diagram shows the actual planned box positions, but native font rendering can differ.

## Existing list groups

Select items from one ListSorter group, without unrelated objects, and reopen Sort List. The plugin identifies groups from selected elements instead of overlapping rectangles. Only an identified group triggers a current-page scan.

- **Realign** appears for groups with multiple boxes. It preserves text style and uses the group's existing widths.
- **Format Group** starts with current font size and bold state. Mixed values remain unchanged unless you choose a replacement.
- Groups created by 1.0.x are recognized by their legacy metadata and migrated when edited.

A group that cannot fit after formatting is rejected before any element modification. Group handles are deduplicated and recycled after use. The current file/page is checked before writes. If an operation reports a partial write or reload failure, inspect the note before repeating it; some content may already have changed.

## Validation and installation

Before handing off an artifact, run:

```sh
npm run verify:release
```

This runs TypeScript, lint, tests with coverage, a clean build, and package validation. Both source and packaged manifests must contain the required permissions; the validator also checks identity, version, icon, bundle bytes, ZIP integrity, and native-package presence when required. ListSorter currently has no extra native code and uses the host SDK, so its valid package is JavaScript-only.

Output: `build/outputs/ListSorter.snplg`. Manually copy it to the device and update the plugin through the device's plugin settings. The plugin ID is unchanged.

Before relying on the update, test first-use permissions, deny/allow-once/always-allow, ink and text selections, both output modes, existing groups, cancellation, reopening, and a long list. This release does not promise native one-step undo or Navigation/events/tasks integration; verify those behaviors on your device.

The historical audit is in `audit/CHAUVET-3.29.43-AUDIT.md`. Its archived failing-version fixtures are evidence, not the release acceptance suite.
