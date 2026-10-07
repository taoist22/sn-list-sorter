# ListSorter build handoff

Follow the workspace AGENTS.md and its required references. Also read
`../references/plugin-template-standard.md` before building or handing off a package.

Before providing any installable artifact, run `npm run verify:release` and inspect
its result. This gates handoff on TypeScript, lint, tests with coverage, a clean
build, and the standard package validator. Do not substitute a successful bundle
or a one-off archive inspection for this workflow. Report coverage limitations
and distinguish local validation from device testing.

Keep package.json, package-lock.json, and PluginConfig.json versions aligned,
and preserve pluginID. This plugin currently has no additional native code;
if that changes, require native package validation as well.

For Chauvet permission-system builds, explicitly inspect `uses-permissions` in
both source PluginConfig.json and the built archive. Runtime permission calls do
not replace manifest declarations. The release validator must reject either
manifest if required declarations are absent. Run tests through the real SDK JS
with the native bridge simulated; do not substitute whole-SDK success mocks for
compatibility checks. Device behavior remains unverified until the user tests it.
