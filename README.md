# RustExplorer

RustExplorer is a high-performance, feature-rich dual-pane file explorer built with Tauri, React, TypeScript, and Vite. It combines the blazing fast performance of a Rust backend with a modern, responsive web frontend.

## Features

- **Dual-Pane Navigation:** Seamlessly move and manage files across two side-by-side panes.
- **Smart Workspaces:** Organize and quickly access your frequently used directories and projects.
- **File Previews:** Instant previews for various file types right within the explorer.
- **File Tagging:** Categorize and filter your files using custom tags.
- **Command Palette:** Lightning-fast keyboard-driven command palette for power users.
- **Cross-Platform:** Built on Tauri, providing a native desktop experience with a minimal memory footprint.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Rust, Tauri
- **Testing:** Vitest, React Testing Library

## Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (and `pnpm`)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI requirements](https://tauri.app/v1/guides/getting-started/prerequisites) for your OS

### Installation

1. Install frontend dependencies:
```bash
pnpm install
```

2. Run the development server with Tauri:
```bash
pnpm tauri dev
```

### Testing

To run the frontend test suite:
```bash
pnpm test
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Workspace Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
