# NonLinear GPT Graph

A JointJS (@joint/core) + Vite prototype that turns ChatGPT prompts into a branching knowledge map.

## Features
- Card-based nodes with prompt input, send button, and scrollable response area.
- Arbitrary graph connections: any node can have multiple parents or children and inherits upstream answers as context.
- Node states (loading, stale, error) keep dependencies honest when a parent changes.
- Pan with drag, zoom with Ctrl/? + scroll, double-click to add a node, or hit “New instruction”.
- Floating control panel with OpenAI API key storage (kept in localStorage) plus quick-start templates.
- Offline mock responses if you leave the API key blank.

## Development
```bash
npm install
npm run dev
```
Open http://localhost:5173/ to interact with the graph. For a production build use:
```bash
npm run build
npm run preview
```

## Usage Tips
1. Enter a question in any node and press **Send**.
2. Drag a link from one node to another (or click **Add child**) so children inherit the combined parent context.
3. When a parent changes, children flip to **Needs refresh** until you resend them.
4. Provide an OpenAI API key in the panel to hit the real API; otherwise the built?in mock responds locally.

> This prototype uses the free open-source edition of JointJS from [clientIO/joint](https://github.com/clientIO/joint).