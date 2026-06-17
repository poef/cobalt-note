# Cobalt Notebook note type API

The notebook package is intentionally note-type agnostic. It coordinates focus,
selection, navigation, joins, deletion, clipboard operations, and command routing,
but it does not understand the content format of any note.

A note type integrates with the notebook by exposing a `NotebookNoteAdapter`.
The adapter translates notebook operations expressed as offsets and local ranges
into whatever the note implementation needs internally.

## Ownership model

The ownership boundary is:

```text
Application
  owns note list rendering, toolbar buttons, shortcuts, persistence

NotebookController
  owns cross-note selection, navigation, joins, deletion, clipboard routing,
  and command routing

NotebookNoteAdapter
  owns one note's content format, DOM surface, local selection, geometry,
  fragment conversion, and command implementation

Note value / fragment
  owned by the note implementation
```

The notebook may compare a fragment's `type`, but it must never inspect or mutate
fragment `data`.

## Fragments

A fragment is an opaque piece of note content:

```ts
export interface NotebookNoteFragment {
    type: string;
    data: unknown;
}
```

Each note type chooses its own fragment type and data shape. For example, the
rich-text note uses structured text plus annotations, while the code note uses a
plain `{ text }` object. The notebook treats both as opaque.

Adapters decide whether foreign fragments are supported:

```ts
canInsertFragment(fragment): boolean
insertFragment(offset, fragment): number
canMergeFragment(fragment, direction): boolean
mergeFragment(fragment, direction): NotebookNoteMergeResult | null
```

This means incompatible notes simply decline operations such as join or structured
paste. The notebook should not try to convert between content types itself.

## Selection semantics

All offsets are UTF-16 string offsets in the note's visible text representation.
Ranges are half-open: `[start, end)`.

A note adapter reports and accepts local selections:

```ts
export interface LocalSelectionRange {
    start: number;
    end: number;
}
```

Cross-note selection is owned by the notebook:

```ts
export interface NotebookSelection {
    anchor: { noteIndex: number; offset: number };
    focus: { noteIndex: number; offset: number };
}
```

The adapter is still responsible for drawing local selection decorations for the
ranges the notebook gives it:

```ts
showSelectionRanges(ranges, active?)
clearSelectionRanges()
```

## Geometry and navigation

The notebook asks each adapter for caret and point geometry so it can implement
cross-note pointer selection and arrow-key navigation:

```ts
getCaretClientRect(offset?)
getClientRect()
getOffsetAtPoint(x, y)
focusNearestPoint(x, y)
isCaretOnFirstVisualLine()
isCaretOnLastVisualLine()
```

Adapters may use any implementation strategy. The rich-text note maps offsets to
contenteditable DOM positions. The code note estimates positions in a monospace
textarea.

## Text editing

The notebook uses these methods for local edits and cross-note editing:

```ts
getLength()
getText(start?, end?)
deleteRange(start, end)
insertText(offset, text)
sliceFragment(start, end)
splitFragment(offset)
```

`getText()` provides the plain-text clipboard representation. It should return the
same visible text that the offset model uses.

## Commands

Commands are generic strings routed by the notebook. The notebook does not know
whether a command is an annotation, formatting action, checkbox toggle, or some
future note-specific behavior.

```ts
canApplyCommand?(command, range, value?)
getCommandState?(command, offset)
applyCommand?(command, range, value?)
```

For example, the rich-text note may interpret `"strong"` as bold formatting. The
code note currently rejects all commands.

## Code note textarea limitation

`@cobalt/code-note` currently uses a native `<textarea>`. This keeps the note type
small and preserves native text editing behavior, but native textarea selection
cannot visually participate in notebook-level selections that span multiple notes.

The notebook can still represent cross-note selections logically and route
copy/cut/delete/paste operations through offsets, but visual selection rendering
inside the textarea is limited to the textarea's own native selection.

A future code-note implementation could use a hidden textarea plus a rendered
`<pre>` mirror layer for custom selection painting, or replace the textarea with a
small dedicated code editor surface. That is intentionally out of scope for the
current proof-of-architecture implementation.
