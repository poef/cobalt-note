# cobalt-note

A small contenteditable-based note editor that stores content as plain text plus ordered cobalt annotations.

The source tree is intentionally flat:

```text
src/
  fragment.ts       Core data model and range mutation rules
  commands.ts       Command wrappers for fragment mutations
  registry.ts       Annotation registry and tag parsing
  runs.ts           Effective state evaluation and run generation
  render.ts         Fragment-to-HTML renderer
  selection.ts      DOM selection <-> character offset mapping
  editor-state.ts   Pending annotation state for collapsed selections
  editor.ts         Main editor controller
  index.ts          Public exports
```

The `design/` folder contains the earlier phase files and design notes.

## Build

```bash
npm install
npm run build
```

The TypeScript compiler writes JavaScript, declaration files, and source maps to `dist/`.

## Example

After building, open `example/index.html` from a local web server. For example:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080/example/
```

The example creates a single cobalt editor instance and shows the live fragment JSON below it.


Links are created with Ctrl+K on a non-empty selection. Ctrl+K prompts for a URL and appends an `<a href="...">` annotation for the selected range. Links are not part of pending annotation state for collapsed selections.

## Whitespace and line breaks

Cobalt uses character offsets as its editor coordinate system. The editor host should preserve whitespace so visual caret movement matches the stored text:

```css
.cobalt-editor {
    white-space: pre-wrap;
}
```

Pressing Enter inserts a newline character (`\n`) into the fragment text. If the caret is exactly at the end boundary of an annotation, that annotation does not grow across the newline. If the caret is inside an annotation, the annotation remains intact and includes the newline.
