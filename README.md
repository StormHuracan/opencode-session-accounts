# OpenCode Session Accounts v0.3.1 (experimental)

Pin **different existing ChatGPT/Codex OAuth accounts** to different sessions in **OpenCode Desktop** without globally switching the current OpenAI account.

## Status / security notice

**Experimental prototype, NOT independently audited or production verified.** GUI bundle and OAuth hooks have not been end-to-end tested against a live OpenCode Desktop installation. Test with throwaway accounts and a non-sensitive project first. OpenCode's GUI SDK and WebSocket hooks are experimental and may change in future versions.

The plugin uses OpenCode's local plugin storage for session pins and aliases. Each session ID stores its selected OpenCode credential ID. Each stable ChatGPT account ID stores its alias. Access and refresh tokens stay in OpenCode's credential store.

Pinned sessions read the appropriate existing OAuth credential from OpenCode's built-in credential store and override HTTP and WebSocket auth headers for the **official ChatGPT Codex backend only**. Invalid endpoints cause a hard failure rather than falling back to a different account.

## Requirements

- OpenCode **CLI and Desktop 2.3.2** (the SDK version used for the build and tests)
- Node.js for included unit tests
- Bun or npm to install/build development dependencies
- Two or more existing ChatGPT OAuth accounts added in OpenCode (`opencode auth list`)

## Build

```sh
npm install
npm test
npm run build
```

Do not blindly run installation scripts from third-party packages. Review dependencies first. For testing the pure helper unit tests without installing anything: `node --test test/security.test.js`.

## Load locally

Copy/extract the repository to a stable directory on your machine. Add its absolute directory path to the `plugins` array of your **global** `~/.config/opencode/opencode.jsonc` (merge with existing settings; never replace the whole file):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/Users/YOUR_USERNAME/Projects/opencode-session-accounts"]
}
```

Restart the OpenCode server after changing server-side plugin code:

```sh
opencode service restart
opencode plugin list
```

Then reopen the Desktop app, open an existing chat, click the **Codex: ...** pill above the chat composer, or use the command palette and search **Select ChatGPT account for this chat**. Choose **OpenAI** or **OpenAI 2**. The assignment is persistent across app restarts. Unassigned chats continue using OpenCode's default active account.

In the same pill, choose **Rename ChatGPT account…** and select an account. Save a one-line alias of up to 60 characters. The pill and selector show **alias (original name)**. Use **Restore original name** to remove the alias. Aliases are shared across chats and follow the ChatGPT account ID if OpenCode replaces a credential ID for that account. Existing session pins continue to use their original credential IDs.

**Important:** make sure the chat is *idle* before switching its account. Do not change the pin in the middle of a generation. The selector controls future requests, not already-open model calls.

## Reconnect a ChatGPT account

1. When you see **Needs login**, **account unavailable**, or an authentication error, open **Codex → Reconnect ChatGPT account…** in the affected chat.
2. Choose **Open Providers**, open **OpenAI**, and select **Sign in with ChatGPT**. Use the same ChatGPT account in the browser. If the browser flow fails, retry from OpenCode's provider settings.
3. Return to the chat and select the reconnected account in the **Codex** menu. You can also run **Select ChatGPT account for this chat** to reload the account list. If OpenCode assigned a new credential ID, repeat the selection in each affected chat. The alias follows the ChatGPT account ID.

The reconnect action opens OpenCode's native provider settings. OpenCode handles the OAuth flow and token storage. Other session pins stay in place.

If the **Codex** button itself is missing, check that you are in an existing top-level chat, run `npm run build` in the plugin directory, and verify the local plugin path in your OpenCode setup. Restart the OpenCode service and reopen Desktop after updating the plugin.

## How it works

- `src/gui.tsx`: native composer pill, command-palette selector, and account rename dialogs.
- `src/rpc.js`: RPC schemas for account labels, aliases, and session pins.
- `src/index.js`: server plugin, OpenCode credential resolution, per-session HTTP and WebSocket hooks.
- `src/security.js`: URL allowlist and per-request header helpers.
- `test/`: offline tests with fake credentials, including alias persistence and independent HTTP and WebSocket routing.

Backend destination is strictly restricted to `https://chatgpt.com/backend-api/codex/...` or `wss://chatgpt.com/backend-api/codex/...`. If a newer OpenCode release changes the endpoint, adjust the allowlist only after verifying the upstream source.

## Known limitations

- **Prototype:** not tested with a real connected OpenCode instance, so compatibility and correct handling of OAuth refresh are not yet established.
- Only for saved `openai` **OAuth** accounts. API keys, other providers, and external credential helpers are excluded.
- No automatic OAuth login flow or refresh UI in this plugin. Add/sign in accounts using the official OpenCode UI or CLI.
- A pinned account that expires/misses the Codex account ID fails closed and may require reauthentication.
- WebSocket hook is experimental; OpenCode may change its behavior.
- Per-session changes during an in-flight request may affect subsequent tool/model steps; switch only when idle.
- OpenCode 2.3.2 exposes the native **ComposerPill** above the message box. See [the composer toolbar proposal](UPSTREAM.md) for a slot beside the model picker.
- Do not use alongside another plugin that forcibly rewrites OpenAI request authentication without understanding hook order.

## Release checklist

- [ ] Verify OpenCode Desktop/CLI version and the SDK used for the build.
- [ ] Reproduce two concurrent sessions (A -> Account 1, B -> Account 2) and confirm routing using account-specific quota deltas, *without ever logging tokens*.
- [ ] Test HTTP, WebSocket, continuation, title, compaction, errors, credential expiry, concurrent use, server restart.
- [ ] Review dependencies and make a locked `package-lock.json` (or `bun.lock`) before any public release.
- [ ] Run a third-party security review before npm publication.
- [ ] Rename/license/authorship fields and remove `private: true` only when ready to publish to npm.

## License

MIT (update attribution as appropriate before publication).
