import { createStore } from "solid-js/store"
import { Command, ComposerPill, createKeyed, Plugin } from "@opencode/plugin/gui"
import { SessionAccounts } from "./rpc.js"

const accountLabel = (account) => account.alias ? `${account.alias} (${account.label})` : account.label
const loginHelp = "In OpenCode Settings, open Providers → OpenAI and sign in with the same ChatGPT account. Then reopen the Codex menu and select the account for this chat."

export default Plugin.define({
  i18n: {
    en: { "command.select": "Select ChatGPT account for this chat" },
    ru: { "command.select": "Выбрать ChatGPT-аккаунт для этого чата" },
  },
  setup(ctx) {
    const [state, setState] = createStore({
      accounts: [],
      selected: {},
    })
    const api = () => ctx.client.rpc(SessionAccounts)
    let listRequest = 0
    const refreshAccounts = async () => {
      const request = ++listRequest
      const list = await api().list({})
      if (request === listRequest) setState("accounts", list.accounts)
      return list.accounts
    }

    const refresh = async (sessionID) => {
      const [accounts, current] = await Promise.all([
        refreshAccounts(),
        api().get({ sessionID }),
      ])
      setState("selected", sessionID, current.credentialID)
      return { accounts, current }
    }

    const openLoginHelp = async (sessionID) => {
      const confirmed = await ctx.dialogs.confirm({
        title: "Reconnect your ChatGPT account",
        description: loginHelp,
        confirm: "Open Providers",
      })
      if (confirmed) ctx.layout.settings("providers")
      await refresh(sessionID)
    }

    const assign = async (sessionID, credentialID) => {
      try {
        const accounts = await refreshAccounts()
        const account = accounts.find((item) => item.id === credentialID)
        if (credentialID && (!account || account.status === "needs-auth")) {
          await openLoginHelp(sessionID)
          return
        }
        await api().set({ sessionID, credentialID })
        const current = await api().get({ sessionID })
        setState("selected", sessionID, current.credentialID)
      } catch (error) {
        await ctx.dialogs.alert({
          title: "Could not change account",
          description: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const choose = async (sessionID) => {
      try {
        const { accounts, current } = await refresh(sessionID)
        const chosen = await ctx.dialogs.select({
          title: "ChatGPT account — this chat only",
          current: current.credentialID,
          options: [
            { title: "Default (OpenCode active account)", value: "" },
            ...accounts.map((item) => ({
              title: accountLabel(item),
              value: item.id,
              description: item.status === "ready" ? "ChatGPT OAuth" : "Needs login",
            })),
          ],
        })
        if (chosen !== undefined) await assign(sessionID, chosen)
      } catch (error) {
        await ctx.dialogs.alert({
          title: "Could not read accounts",
          description: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const rename = async () => {
      try {
        const accounts = await refreshAccounts()
        const credentialID = await ctx.dialogs.select({
          title: "Rename ChatGPT account",
          options: accounts.filter((item) => item.canRename).map((item) => ({
            title: accountLabel(item), value: item.id,
          })),
        })
        if (credentialID === undefined) return
        const account = accounts.find((item) => item.id === credentialID)
        const action = account.alias ? await ctx.dialogs.select({
          title: accountLabel(account),
          options: [
            { title: "Edit alias", value: "edit" },
            { title: "Restore original name", value: "restore" },
          ],
        }) : "edit"
        if (action === undefined) return
        const alias = action === "restore" ? "" : await ctx.dialogs.prompt({
          title: `Rename ${account.label}`,
          description: "Use a single line of up to 60 characters.",
          value: account.alias,
          submit: "Save",
        })
        if (alias === undefined) return
        await api().rename({ credentialID, alias })
        await refreshAccounts()
      } catch (error) {
        await ctx.dialogs.alert({
          title: "Could not rename account",
          description: error instanceof Error ? error.message : String(error),
        })
      }
    }

    createKeyed(
      () => ctx.sessions.current()?.id,
      (sessionID) => {
        if (sessionID) void refresh(sessionID).catch(() => {})
      },
    )

    ctx.add(ComposerPill, {
      id: "account",
      show: ({ session }) => {
        const assigned = state.selected[session.id] ?? ""
        const account = state.accounts.find((item) => item.id === assigned)
        const unavailable = account?.status === "needs-auth" || (!!assigned && !account)
        return {
          label: account ? `Codex: ${accountLabel(account)}` : unavailable ? "Codex: account unavailable" : "Codex: default",
          title: "ChatGPT subscription for this chat (switch when idle)",
          tone: unavailable ? "warning" : undefined,
          rows: [
            {
              id: "default",
              label: "Default OpenCode account",
              detail: assigned ? "" : "Selected",
              run: () => void assign(session.id, ""),
            },
            ...state.accounts.map((item) => ({
              id: item.id,
              label: accountLabel(item),
              detail: item.status === "needs-auth" ? "Needs login" : item.id === assigned ? "Selected" : "ChatGPT OAuth",
              run: () => void assign(session.id, item.id),
            })),
            {
              id: "reconnect-account",
              label: "Reconnect ChatGPT account…",
              run: () => void openLoginHelp(session.id).catch(() => {}),
            },
            ...(state.accounts.some((item) => item.canRename) ? [{
              id: "rename-account",
              label: "Rename ChatGPT account…",
              run: () => void rename(),
            }] : []),
          ],
        }
      },
    })

    ctx.add(Command, () => ({
      id: "select",
      title: ctx.t("command.select"),
      keywords: "codex chatgpt openai account subscription",
      section: "session",
      enabled: !!ctx.sessions.current(),
      run: async () => {
        const session = ctx.sessions.current()
        if (session) await choose(session.id)
      },
    }))
  },
})
