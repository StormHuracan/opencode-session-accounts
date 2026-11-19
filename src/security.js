/** Security-sensitive helpers; deliberately no logs or network calls. */
export function assertCodexURL(raw) {
  const url = new URL(raw)
  const secure = url.protocol === "https:" || url.protocol === "wss:"
  if (!secure || url.hostname !== "chatgpt.com" || !url.pathname.startsWith("/backend-api/codex/")) {
    throw new Error("Pinned ChatGPT account refuses to send its token to a non-Codex endpoint")
  }
}

/** The account id is present in the OAuth JWT issued by OpenAI. */
export function getChatGPTAccountID(oauth) {
  const md = oauth?.metadata ?? {}
  const fromMeta = md.accountID ?? md.accountId ?? md.chatgpt_account_id
  if (typeof fromMeta === "string" && fromMeta.length) return fromMeta

  const segment = oauth?.access?.split(".")?.[1]
  if (!segment) throw new Error("OAuth access token does not contain a JWT payload")
  let claims
  try {
    claims = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"))
  } catch {
    throw new Error("Cannot decode the OpenAI OAuth account information")
  }
  const id = claims?.["https://api.openai.com/auth"]?.chatgpt_account_id
    ?? claims?.chatgpt_account_id
  if (typeof id !== "string" || !id) throw new Error("ChatGPT account id missing from OAuth credential")
  return id
}

export function applyHTTPHeaders(request, access, accountID) {
  assertCodexURL(request.url)
  request.headers.set("Authorization", `Bearer ${access}`)
  request.headers.set("ChatGPT-Account-Id", accountID)
  request.headers.delete("api-key")
  request.headers.delete("x-api-key")
}

export function applyWebSocketHeaders(event, access, accountID) {
  assertCodexURL(event.url)
  for (const name of Object.keys(event.headers)) {
    if (/^(authorization|chatgpt-account-id|api-key|x-api-key)$/i.test(name)) delete event.headers[name]
  }
  event.headers.authorization = `Bearer ${access}`
  event.headers["chatgpt-account-id"] = accountID
}

export function safeSessionID(id) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{5,160}$/.test(id)) {
    throw new Error("Invalid session ID")
  }
  return id
}
