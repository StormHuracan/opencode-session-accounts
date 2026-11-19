import assert from "node:assert/strict"
import test from "node:test"
import plugin from "../src/index.js"

test("aliases follow the ChatGPT account and session pins retain their existing keys", async () => {
  const storage = new Map([["account/session_A", "first"]])
  const accounts = [
    { id: "first", label: "OpenAI", type: "credential", method: "oauth", accountID: "account-one" },
    { id: "second", label: "OpenAI 2", type: "credential", method: "oauth", accountID: "account-two" },
    { id: "third", label: "OpenAI 3", type: "credential", method: "oauth" },
  ]
  const hooks = new Map()
  let rpc
  const ctx = {
    storage: {
      get: (key) => storage.get(key),
      set: (key, value) => storage.set(key, value),
      remove: (key) => storage.delete(key),
    },
    integration: {
      get: () => ({ data: { connections: accounts } }),
      connection: {
        resolve: async ({ accountID }) => accountID && {
          type: "oauth", access: "test-token", metadata: { accountID },
        },
      },
    },
    rpc: { register: (_, handlers) => { rpc = handlers } },
    session: { hook: (name, handler) => hooks.set(name, handler) },
  }
  await plugin.setup(ctx)
  await rpc.set({ sessionID: "session_B", credentialID: "second" })
  await assert.rejects(rpc.rename({ credentialID: "third", alias: "Missing" }), /unavailable/i)
  await assert.rejects(rpc.rename({ credentialID: "first", alias: "a\nb" }), /single line/)
  await rpc.rename({ credentialID: "first", alias: "  Work  " })
  await plugin.setup(ctx)
  const { accounts: listed } = await rpc.list()
  assert.deepEqual(listed.map(({ label, alias, canRename }) => [label, alias, canRename]), [
    ["OpenAI", "Work", true], ["OpenAI 2", "", true], ["OpenAI 3", "", false],
  ])
  for (const [sessionID, accountID] of [["session_A", "account-one"], ["session_B", "account-two"]]) {
    const request = new Request("https://chatgpt.com/backend-api/codex/responses")
    await hooks.get("http.request")({ sessionID, request })
    assert.equal(request.headers.get("ChatGPT-Account-Id"), accountID)
    const headers = {}
    await hooks.get("experimental.ws.handshake")({
      sessionID, headers, url: "wss://chatgpt.com/backend-api/codex/responses",
    })
    assert.equal(headers["chatgpt-account-id"], accountID)
  }
  accounts[0].id = "replacement"
  await assert.rejects(hooks.get("http.request")({
    sessionID: "session_A",
    request: new Request("https://chatgpt.com/backend-api/codex/responses"),
  }), /Reconnect ChatGPT account/)
  assert.equal((await rpc.list()).accounts[0].alias, "Work")
  await rpc.rename({ credentialID: "replacement", alias: "" })
  assert.equal((await rpc.list()).accounts[0].alias, "")
  assert.equal((await rpc.get({ sessionID: "session_A" })).credentialID, "first")
  await rpc.set({ sessionID: "session_A", credentialID: "" })
  assert.equal((await rpc.get({ sessionID: "session_A" })).credentialID, "")
  assert.equal((await rpc.get({ sessionID: "session_B" })).credentialID, "second")
})
