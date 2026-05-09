# Selfer AI Agent Implementation Plan

This plan outlines the creation of "Selfer", a local-aware Linux AI agent with a multi-model "Thinking Core", file system awareness, and persistent memory.

## User Review Required

> [!IMPORTANT]
> The agent will have access to your local file system from root. While it runs under your user permissions, it is powerful and should be used with caution.

> [!NOTE]
> Phase 1 focuses on the core orchestration and a "Working Prototype" that can search files and answer questions using Ollama (default) or other providers.

## Phase 1: Basic Prototype & Core Orchestration [CURRENT]

### Goals
- [x] Initialize the Node.js TypeScript project.
- [x] Implement the `ThinkingCore` (Agentic Loop).
- [x] Create a modular `Provider` system (Ollama, Gemini, Anthropic).
- [x] Implement basic `FileSystem` tools (list, search, read).
- [ ] Create a basic CLI entry point.

### Proposed Changes

#### [NEW] [package.json](file:///media/surya/windows/Users/chint/Desktop/selfer/package.json)
- Define project dependencies and scripts.
- Set up as a module for NPM compatibility.

#### [NEW] [tsconfig.json](file:///media/surya/windows/Users/chint/Desktop/selfer/tsconfig.json)
- TypeScript configuration for modern Node.js.

#### [NEW] [src/core/ThinkingCore.ts](file:///media/surya/windows/Users/chint/Desktop/selfer/src/core/ThinkingCore.ts)
- The main orchestration loop.
- Manages message history, tool calls, and turns.

#### [NEW] [src/providers/BaseProvider.ts](file:///media/surya/windows/Users/chint/Desktop/selfer/src/providers/BaseProvider.ts)
- Abstract class for model providers.

#### [NEW] [src/providers/OllamaProvider.ts](file:///media/surya/windows/Users/chint/Desktop/selfer/src/providers/OllamaProvider.ts)
- Implementation for local models via Ollama.

#### [NEW] [src/tools/FileSystemTool.ts](file:///media/surya/windows/Users/chint/Desktop/selfer/src/tools/FileSystemTool.ts)
- Basic tools: `ls`, `search`, `cat`.

#### [NEW] [src/index.ts](file:///media/surya/windows/Users/chint/Desktop/selfer/src/index.ts)
- CLI entry point using `commander`.

## Phase 2: Memory & Context [PENDING]
- Implement persistent history storage.
- Add "Planner" mode for multi-step tasks.
- Implement token counting and history compaction.

## Verification Plan

### Automated Tests
- We will add unit tests for the `FileSystemTool` in Phase 2.
- Manual verification of the agent loop via CLI.

### Manual Verification
- Run `npm start -- "Find all .txt files in the current directory"` and verify tool calls.
- Run `npm start -- "What is the content of package.json?"`.
