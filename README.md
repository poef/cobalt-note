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

There is also a minimal notebook demo that renders multiple independent note editors and coordinates note splitting with Ctrl+Enter:

```text
http://localhost:8080/example/notebook.html
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


## Notebook coordination

A single cobalt editor only owns one fragment. It does not know about sibling notes. For notebook-style applications, handle notebook-level shortcuts in the parent application and use the editor API to read the current selection.

```ts
const editor = edit(element, fragment);

element.addEventListener("keydown", event => {
    if (event.key !== "Enter" || !event.ctrlKey) {
        return;
    }

    const selection = editor.getSelection();

    if (!selection) {
        return;
    }

    event.preventDefault();

    const { before, after } = splitFragment(fragment, selection.start);
    // Replace the current note with before/after in your notebook model.
});
```

In the example notebook, Ctrl+Enter is handled by the notebook application. The parent splits the current fragment at the cursor offset, replaces the note with two notes, and focuses the new next note at offset 0. Normal Enter still inserts a newline inside the current note.

Notebook applications can also join notes. When Backspace is pressed at offset 0, or Delete is pressed at the end of a note, the editor dispatches a cancelable `cobalt:joinrequest` custom event. The parent notebook may call `event.preventDefault()` to accept and handle the join, or ignore the event to refuse it.

```ts
import {
    COBALT_JOIN_REQUEST_EVENT,
    edit,
    joinFragments
} from "cobalt-note";

const editor = edit(element, fragment);

element.addEventListener(COBALT_JOIN_REQUEST_EVENT, event => {
    if (event.detail.direction === "backward") {
        event.preventDefault();
        // Join this note with the previous note in your notebook model.
    }

    if (event.detail.direction === "forward") {
        event.preventDefault();
        // Join this note with the next note in your notebook model.
    }
});
```

`joinFragments(first, second)` returns a joined fragment and the original end offset of `first`, which is the natural caret position after joining. It inserts one newline between fragments unless the boundary already contains one.
