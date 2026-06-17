# Cobalt Note

Cobalt Note is an experimental notebook-style editor built around small note editors and a notebook controller.

This repository is now organized as an npm-workspaces monorepo. The code is still TypeScript in this step; the next migration step is to convert the packages to approachable JavaScript once the package boundaries have settled.

## Packages

```text
packages/
  note-core/        Shared low-level DOM/selection/geometry helpers.
  rich-text-note/   The current Cobalt rich text note editor.
  notebook/         Generic notebook coordination logic.
  example-app/      Browser examples using the packages.
```

### `@cobalt/note-core`

Contains reusable low-level browser helpers that future note types may need:

- DOM selection to text offsets
- text offsets to DOM selection
- caret geometry
- nearest offset lookup from a client coordinate
- word/paragraph range helpers

This is where complex selection/cursor handling should gradually move so custom note authors do not have to reimplement it.

### `@cobalt/rich-text-note`

Contains the current fragment-based rich text note editor:

- fragments and annotations
- commands
- registry
- rendering
- clipboard support
- the `edit(element, fragment)` note editor

### `@cobalt/notebook`

Contains generic notebook coordination logic:

- notebook-level selection
- cross-note cursor movement
- cross-note selection decorations
- pointer selection support

It talks to notes through a `NotebookNoteAdapter`, so future note types do not need to be based on the rich text note editor.

### `@cobalt/example-app`

Contains the current browser examples. The exact key bindings remain here on purpose; the notebook package provides primitives, while the app decides which keys trigger which notebook operations.

## Build

From the repository root:

```bash
npm install
npm run build
```

The examples import from the package `dist/` directories, so run the build before opening them.

## Run the examples

```bash
cd packages/example-app
npm run start
```

Then open:

- `http://localhost:8080/index.html`
- `http://localhost:8080/notebook.html`

## Next planned refactors

1. Extract more generic helpers into `@cobalt/note-core`.
2. Clarify and document the `NotebookNoteAdapter` contract.
3. Add a second simple note type to test whether the adapter is generic enough.
4. Convert packages from TypeScript to simple JavaScript with JSDoc for public APIs.
