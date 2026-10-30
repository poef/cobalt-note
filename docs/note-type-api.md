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
  owns note list rendering, toolbar buttons, notebook-level shortcuts, persistence

NotebookController
  owns cross-note selection, navigation, joins, deletion, clipboard routing,
  and command routing

NotebookNoteAdapter
  owns one note's content format, DOM surface, local selection, geometry,
  keyboard interpretation, fragment conversion, and command implementation

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

Most text-like notes use UTF-16 string offsets in the note's visible text representation.
Non-text notes may combine logical positions with text offsets. Image notes use
offset `0` before the image, `1` after the image and at the start of its caption,
then UTF-16 caption offsets shifted by one. Their total length is
`1 + caption.length`. Ranges are half-open: `[start, end)`.

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
canSplit?(offset)
splitFragment(offset)
```

`getText()` provides the plain-text clipboard representation. For text-like notes
it should return the same visible text that the offset model uses. Atomic or
media notes may return a caption, alt text, filename, or another useful textual
fallback.

`canSplit?(offset)` lets atomic notes decline operations that require splitting a
note into two fragments. If omitted, the notebook treats the note as splittable
for backward compatibility with simple text-like adapters.

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

## Image notes and captions

`@cobalt/image-note` combines an indivisible image with an editable rich-text
caption. It declines splitting and merging the note, but accepts rich-text
fragments inserted at caption offsets (`1` and above). Multi-fragment paste is
declined because the notebook would need to split the enclosing image note.

Caption-only slices produce rich-text fragments; slices containing the image
produce image fragments with the selected caption content. Caption formatting
commands are delegated to the rich-text editor. `set-alt` and `set-caption` are
image-note commands. Plain-text copying uses the selected image's alt text and
caption text as a fallback.

The editor owns navigation and key interpretation within the image and caption.
Delete at image offset `0` or Backspace at image offset `1` requests whole-note
removal when the image surface has focus. Caption keystrokes remain caption edits.
The editor ignores modified keys, composition, and keys already consumed by an
ancestor handling a notebook-wide operation.

### Note removal requests

A note editor can dispatch a bubbling `cobalt:request-remove-note` CustomEvent
from its root element. Its detail is `{ direction: "previous" | "next" }`, a
preferred focus direction after removal. It contains no key names, note types,
or internal caret offsets. Hosts associate the event target with their note.

The editor emits an intent only: it does not remove DOM, mutate the host's note
list, or focus a neighboring note. The application may accept or ignore the
request. The example app removes the note, rerenders, and focuses a neighbor;
it keeps at least one note. Thus image-specific key semantics stay in image-note,
while list mutation and focus after removal stay in the application.

```js
element.addEventListener("cobalt:request-remove-note", event => {
    if (event.target !== element) return;
    event.stopPropagation();
    removeNote(index, event.detail.direction);
});
```

The adapter's `deleteRange` edits caption text; `deleteRange(0, 1)` does not
remove the enclosing note. Whole-note removal through a cross-note selection
still needs an explicit notebook/application contract.

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
