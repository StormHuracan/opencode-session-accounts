# Proposal for an OpenCode composer toolbar slot

OpenCode 2.3.2 exposes `ComposerPill` above the composer and `window.bottom` at window scope. A session-scoped GUI contribution beside the model picker would let a plugin display and change a setting that applies to the next message in that session.

Please consider a composer toolbar registry with a host-rendered trigger and menu, modeled on `ComposerPill`. Pass the mounted session and screen, support stable ordering, and keep placement and overflow under host control. On narrow layouts the host could move contributions into an overflow menu. The trigger and menu should use the existing composer keyboard and focus conventions.

An account selector is one use case. It shows the ChatGPT account pinned to the current session, or the OpenCode default, and offers a native menu to switch accounts. Each session supplies its own state, so navigating between chats updates the control without modifying the global account.
