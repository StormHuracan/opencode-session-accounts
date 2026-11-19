import { Plugin } from "@opencode/plugin"
import { SessionAccounts } from "./rpc.js"
import {
  applyHTTPHeaders,
  applyWebSocketHeaders,
  getChatGPTAccountID,
  safeSessionID,
} from "./security.js"

const integrationID = "openai"
const sessionKey = (id) => `account/${safeSessionID(id)}`
const reconnectHelp = "Open the Codex menu in this chat, choose Reconnect ChatGPT account, then sign in through OpenCode and select the account again."

export default Plugin.define({
  id: "session-accounts",
  async setup(ctx) {
    const connections = async () => {
      const integration = await ctx.integration.get({ integrationID })
      return (integration?.data?.connections ?? []).filter(
        (entry) => entry.type === "credential" && entry.method === "oauth",
      )
    }

    const selection = async (sessionID) => {
      const credentialID = await ctx.storage.get(sessionKey(sessionID))
      return typeof credentialID === "string" ? credentialID : ""
    }

    const aliasKey = async (connection) => {
      const credential = await ctx.integration.connection.resolve(connection)
      if (credential?.type !== "oauth") throw new Error("ChatGPT account ID unavailable")
      return `alias/${encodeURIComponent(getChatGPTAccountID(credential))}`
    }

    const accountView = async (item) => {
      let key
      try {
        key = await aliasKey(item)
      } catch {
        // An unavailable credential remains visible with its original label.
      }
      const alias = key ? await ctx.storage.get(key) : undefined
      return {
        id: item.id,
        label: item.label,
        alias: typeof alias === "string" ? alias : "",
        canRename: !!key,
        status: item.status?.status === "needs_auth" ? "needs-auth" : "ready",
      }
    }

    const authForSession = async (sessionID) => {
      const credentialID = await selection(sessionID)
      if (!credentialID) return undefined // no pin: keep OpenCode's normal behavior
      const connection = (await connections()).find((item) => item.id === credentialID)
      if (!connection) throw new Error(`The pinned ChatGPT account is unavailable. ${reconnectHelp}`)
      if (connection.status?.status === "needs_auth") {
        throw new Error(`The selected ChatGPT account needs to sign in again. ${reconnectHelp}`)
      }
      // OpenCode owns the credential store and refresh flow. We don't copy or persist tokens.
      const credential = await ctx.integration.connection.resolve(connection).catch(() => undefined)
      if (!credential || credential.type !== "oauth" || !credential.access) {
        throw new Error(`Unable to load the pinned ChatGPT account. ${reconnectHelp}`)
      }
      return { access: credential.access, accountID: getChatGPTAccountID(credential) }
    }

    await ctx.rpc.register(SessionAccounts, {
      list: async () => ({
        accounts: await Promise.all((await connections()).map(accountView)),
      }),
      rename: async ({ credentialID, alias }) => {
        const name = alias.trim()
        if ([...name].length > 60 || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(name)) {
          throw new Error("Use a single line of up to 60 characters")
        }
        const connection = (await connections()).find((item) => item.id === credentialID)
        if (!connection) throw new Error("Unknown OpenAI OAuth credential ID")
        const key = await aliasKey(connection)
        if (name) await ctx.storage.set(key, name)
        else await ctx.storage.remove(key)
        return { ok: true }
      },
      get: async ({ sessionID }) => ({ credentialID: await selection(sessionID) }),
      set: async ({ sessionID, credentialID }) => {
        const key = sessionKey(sessionID)
        if (credentialID === "") {
          await ctx.storage.remove(key)
          return { ok: true }
        }
        const available = await connections()
        if (!available.some((entry) => entry.id === credentialID)) {
          throw new Error("Unknown OpenAI OAuth credential ID")
        }
        await ctx.storage.set(key, credentialID)
        return { ok: true }
      },
    })

    // Both hooks are necessary. OpenCode can send a session via HTTP or WebSocket.
    // A pinned session fails closed if the endpoint/credential cannot be verified.
    await ctx.session.hook("http.request", async (event) => {
      const auth = await authForSession(event.sessionID)
      if (auth) applyHTTPHeaders(event.request, auth.access, auth.accountID)
    }, { providerID: integrationID })

    await ctx.session.hook("experimental.ws.handshake", async (event) => {
      const auth = await authForSession(event.sessionID)
      if (auth) applyWebSocketHeaders(event, auth.access, auth.accountID)
    }, { providerID: integrationID })
  },
})
