import { Rpc } from "@opencode/plugin/rpc"

const string = { type: "string" }
const boolean = { type: "boolean" }
const object = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
})

export const SessionAccounts = Rpc.define({
  id: "session-accounts",
  events: {},
  methods: {
    list: {
      input: object({}),
      output: object({
        accounts: {
          type: "array",
          items: object(
            { id: string, label: string, alias: string, canRename: boolean, status: string },
            ["id", "label", "alias", "canRename", "status"],
          ),
        },
      }, ["accounts"]),
    },
    rename: {
      input: object({ credentialID: string, alias: string }, ["credentialID", "alias"]),
      output: object({ ok: boolean }, ["ok"]),
    },
    get: {
      input: object({ sessionID: string }, ["sessionID"]),
      output: object({ credentialID: string }, ["credentialID"]),
    },
    set: {
      input: object({ sessionID: string, credentialID: string }, ["sessionID", "credentialID"]),
      output: object({ ok: { type: "boolean" } }, ["ok"]),
    },
  },
})
