# Selfer AI Agent Implementation Plan

This plan outlines the creation of "Selfer", a local-aware Linux AI agent with a multi-model "Thinking Core", file system awareness, and persistent memory.

## User Review Required

> [!IMPORTANT]
> The agent will have access to your local file system from root. While it runs under your user permissions, it is powerful and should be used with caution.

> [!NOTE]
> Phase 1 focuses on the core orchestration and a "Working Prototype" that can search files and answer questions using Ollama (default) or other providers.

## Phase 1: Basic Prototype & Core Orchestration [DONE]

### Goals
- [x] Initialize the Node.js TypeScript project.
- [x] Implement the `ThinkingCore` (Agentic Loop).
- [x] Create a modular `Provider` system (Ollama, Gemini, Anthropic).
- [x] Implement basic `FileSystem` tools (list, search, read).
- [x] Create a basic CLI entry point.

## Phase 1.5: Interactive Setup & CLI Package [DONE]
- [x] Add global `bin` support in `package.json`.
- [x] Implement interactive provider selection and API key verification.
- [x] Create a "Claude-like" terminal UI with banners and colored roles.
- [x] Implement shebang for global execution.
- [x] Implement `checkConnection` for all providers.

## Phase 2: Memory & Context [DONE]
- [x] Implement persistent history storage (SQLite or JSON).
- [x] Add "Planner" mode for multi-step tasks.
- [x] Implement token counting and history compaction.
- [x] Support for Groq and Anthropic providers.

## Phase 3: Advanced Tools & Stability [DONE]
- [x] Implement `ShellTool` for executing commands (with confirmation).
- [x] Implement `WebSearch` tool (via Serper).
- [x] Add a `config` command to manage API keys and default models.
- [x] Implement robust error handling and auto-retry for provider timeouts.
- [x] Add support for "Vision" (via provider-native capabilities).

## Verification Plan

### Manual Verification
1. `npm install` (Local)
2. `npm run build`
3. `node dist/index.js` (Verify banner and interactive selection)
4. Verify tool calling output with new styling.
