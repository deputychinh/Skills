# Vite monorepo — notes for multi-package layouts

Use this layout when one repo holds several deployables or shared packages: npm workspaces
`apps/web` (Vite + Vue or React), `packages/ui` (tokens + components), optional `packages/cli`, and
the backend in `services/{api,worker}` (a uv workspace for Python, npm workspaces for Node). Shared
root configs: `eslint.config.mjs`, `stylelint.config.mjs`, `tsconfig.base.json`.

## Scaffold

- Vue: `npm create vue@latest apps/web -- --ts --router --pinia --vitest --playwright --eslint --prettier`.
- React: `npm create vite@latest apps/web -- --template react-ts --no-interactive`.
- Then fold the generated lint config into the root `eslint.config.mjs` and replace the generated
  `tsconfig.app.json` / `tsconfig.node.json` pair with one tsconfig extending `tsconfig.base.json`,
  so every package is checked by the same rules.
- Default to npm workspaces: pnpm and Yarn need corepack, which recent Node releases no longer bundle,
  so a fresh machine cannot run `make install` without an extra step (memory: check the Node release
  notes for the version in use).

## Gotchas

| Symptom                                                                                                                     | Cause                                                                        | Fix                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot read properties of null (reading 'useEffect')` or a Vue "inject() can only be used inside setup" warning at runtime | Two copies of the framework: the UI package resolved its own `react` / `vue` | Pin the **same** framework version in every workspace (or make it a peer dependency of `packages/ui`); `npm ls react` / `npm ls vue` must show one version                 |
| The UI package cannot import its own files with `@/…`                                                                       | The `@/` alias belongs to the app's bundler config, not to the package       | Give the package Node subpath imports, `"imports": {"#ui/*": "./src/*"}`, plus matching `paths` in both tsconfigs                                                          |
| Peer-range errors from typescript-eslint or a code generator after a TypeScript bump                                        | Their peer range lags the newest TypeScript major                            | Pin the TypeScript major they support; add an npm `overrides` entry (`"<tool>": {"typescript": "$typescript"}`) so the tool uses the workspace TypeScript                  |
| Playwright's `webServer` times out although the preview started                                                             | `vite preview` bound to a host the runner does not probe                     | Start it with `vite preview --host 127.0.0.1 --port <port>` and use the same URL in `webServer.url`; `webServer` may be an array that also starts the API (`cwd: '../..'`) |
| The page loads but every API call fails with a CORS error                                                                   | Vite prints `localhost`; the API allows only `127.0.0.1` (or the reverse)    | Allow both hosts for every dev and preview port, and test the CORS list                                                                                                    |
| pytest collects two `tests` packages and fails with an import mismatch                                                      | Two services each have `tests/__init__.py`                                   | Use `--import-mode=importlib` and drop `tests/__init__.py`                                                                                                                 |
| A status constant is missing on an older Python                                                                             | `HTTPStatus.UNPROCESSABLE_CONTENT` exists only from Python 3.13              | Use `UNPROCESSABLE_ENTITY` on 3.12                                                                                                                                         |
