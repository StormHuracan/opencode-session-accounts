# OpenCode Session Accounts

Use different ChatGPT subscriptions in different OpenCode Desktop chats. For example, pin your work account to one chat and your personal account to another. Each chat remembers its selection when you reopen OpenCode.

## Install

You’ll need OpenCode Desktop and CLI 2.3.2, Node.js with npm, and ChatGPT accounts connected in OpenCode under **Settings → Providers → OpenAI → Sign in with ChatGPT**.

```sh
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/StormHuracan/opencode-session-accounts.git
cd opencode-session-accounts
npm ci
npm run build
pwd
```

Add the absolute path printed by `pwd` to the `plugins` array in `~/.config/opencode/opencode.jsonc`. Keep any entries already in that array.

```jsonc
{
  "plugins": ["/Users/YOUR_USERNAME/Projects/opencode-session-accounts"]
}
```

Run `opencode service restart`, then reopen OpenCode Desktop.

## Use

- **Choose an account.** Open an existing chat and click **Codex** above the message box. Pick an account while the chat is idle. Choose **Default OpenCode account** to clear the chat’s selection and use OpenCode’s active account.
- **Rename an account.** Choose **Rename ChatGPT account…** from the same menu. The alias is saved locally and appears alongside the original name in every chat. Choose **Restore original name** to remove it.
- **Reconnect an account.** If the menu shows **Needs login**, choose **Reconnect ChatGPT account… → Open Providers**. Under **OpenAI**, sign in to the same ChatGPT account, then select it again in each chat where you use it.
