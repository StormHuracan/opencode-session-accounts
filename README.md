# OpenCode Session Accounts

Use different ChatGPT subscriptions in different OpenCode Desktop chats. For example, pin your work account to one chat and your personal account to another. Each chat remembers its selection when you reopen OpenCode.

## Install on Windows, macOS, or Linux

With OpenCode Desktop and CLI 2.3.2 installed, run this command in PowerShell on Windows or in your terminal on macOS or Linux:

```text
opencode plugin add github:StormHuracan/opencode-session-accounts
```

Reopen OpenCode Desktop. To connect a ChatGPT account, go to **Settings → Providers → OpenAI → Sign in with ChatGPT**.

## Use

- **Choose an account.** Open an existing chat and click **Codex** above the message box. Pick an account while the chat is idle. Choose **Default OpenCode account** to clear the chat’s selection and use OpenCode’s active account.
- **Rename an account.** Choose **Rename ChatGPT account…** from the same menu. The alias is saved locally and appears alongside the original name in every chat. Choose **Restore original name** to remove it.
- **Reconnect an account.** If the menu shows **Needs login**, choose **Reconnect ChatGPT account… → Open Providers**. Under **OpenAI**, sign in to the same ChatGPT account, then select it again in each chat where you use it.
