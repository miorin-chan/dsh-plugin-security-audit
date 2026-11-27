# Plugin security audit

[简体中文](README.zh.md)

Open an installed bundle's detail page in **Plugins**.
When an update is available, **Audit update** opens a new conversation with a draft
for reviewing the installed and target versions.
Review the draft and send it when ready.
DSH may reuse an empty conversation and append the prompt to its existing draft.

Supports registry updates and updates from the official catalog.
Requires DeepSeek Harness 0.2.2-rc.5 or later with the Web client.
The plugin is included in [Plugin Atlas](../dsh-atlas-plugin/README.md).

## Screenshots

The real **Audit update** control opened an unsent draft for a synthetic package fixture.
No audit was run. The screenshots show the Chinese UI.

![Unsent draft opened by the Audit update control for a synthetic package fixture](docs/assets/screenshots/main-light.png)

[Main view in dark mode](docs/assets/screenshots/main-dark.png) · Audit update control
([light](docs/assets/screenshots/entry-light.png) / [dark](docs/assets/screenshots/entry-dark.png))

[Project documentation](docs/README.md)
