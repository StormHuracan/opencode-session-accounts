import test from "node:test"
import assert from "node:assert/strict"
import {
  assertCodexURL,
  getChatGPTAccountID,
  applyHTTPHeaders,
  applyWebSocketHeaders,
  safeSessionID,
} from "../src/security.js"

function token(account = "acct-a") {
  const payload = Buffer.from(JSON.stringify({
    "https://api.openai.com/auth": { chatgpt_account_id: account },
  })).toString("base64url")
  return `header.${payload}.signature`
}

test("decodes account ID from a mock JWT", () => {
  assert.equal(getChatGPTAccountID({ access: token("acct-2") }), "acct-2")
})

test("rejects unknown / insecure destinations", () => {
  for (const url of [
    "http://chatgpt.com/backend-api/codex/responses",
    "https://evil.example/backend-api/codex/responses",
    "https://chatgpt.com.evil.example/backend-api/codex/responses",
    "https://chatgpt.com/backend-api/other",
  ]) assert.throws(() => assertCodexURL(url))
  assert.doesNotThrow(() => assertCodexURL("https://chatgpt.com/backend-api/codex/responses"))
  assert.doesNotThrow(() => assertCodexURL("wss://chatgpt.com/backend-api/codex/responses"))
})

test("HTTP routing only updates auth headers on intended request", () => {
  const request = new Request("https://chatgpt.com/backend-api/codex/responses", {
    headers: { authorization: "Bearer wrong", "api-key": "wrong" },
  })
  applyHTTPHeaders(request, "chosen-token", "acct-a")
  assert.equal(request.headers.get("authorization"), "Bearer chosen-token")
  assert.equal(request.headers.get("chatgpt-account-id"), "acct-a")
  assert.equal(request.headers.get("api-key"), null)
})

test("WebSocket routing does not leave old auth headers", () => {
  const event = {
    url: "wss://chatgpt.com/backend-api/codex/responses",
    headers: { Authorization: "Bearer wrong", "ChatGPT-Account-ID": "old", "x-api-key": "old" },
  }
  applyWebSocketHeaders(event, "new-token", "acct-b")
  assert.equal(event.headers.authorization, "Bearer new-token")
  assert.equal(event.headers["chatgpt-account-id"], "acct-b")
  assert.equal(Object.keys(event.headers).length, 2)
})

test("storage keys reject crafted session IDs", () => {
  assert.equal(safeSessionID("ses_example123"), "ses_example123")
  assert.throws(() => safeSessionID("../auth.json"))
})
