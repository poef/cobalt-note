import test from "node:test";
import assert from "node:assert/strict";

import { NotebookController } from "../dist/index.js";

function createAdapter({
    type = "test/note",
    text,
    accepts = () => true,
    merge = (ownText, fragment) => ({ text: ownText + "\n" + fragment.data.text })
}) {
    let value = { text };

    return {
        getType() {
            return type;
        },
        getValue() {
            return value;
        },
        setValue(nextValue) {
            value = nextValue;
        },
        getLength() {
            return value.text.length;
        },
        focus() {},
        getSelection() {
            return null;
        },
        getCaretClientRect() {
            return null;
        },
        isCaretOnFirstVisualLine() {
            return true;
        },
        isCaretOnLastVisualLine() {
            return true;
        },
        focusNearestPoint() {},
        getOffsetAtPoint() {
            return 0;
        },
        getClientRect() {
            return { left: 0, right: 0, top: 0, bottom: 0 };
        },
        showSelectionRanges() {},
        clearSelectionRanges() {},
        deleteRange() {},
        insertText() {},
        sliceFragment(start, end) {
            return {
                type,
                data: {
                    text: value.text.slice(start, end)
                }
            };
        },
        canInsertFragment(fragment) {
            return accepts(fragment);
        },
        insertFragment(offset, fragment) {
            value = {
                text: value.text.slice(0, offset) + fragment.data.text + value.text.slice(offset)
            };
            return offset + fragment.data.text.length;
        },
        splitFragment(offset) {
            return {
                before: this.sliceFragment(0, offset),
                after: this.sliceFragment(offset, value.text.length)
            };
        },
        canMergeFragment(fragment, direction) {
            return direction === "after" && accepts(fragment);
        },
        mergeFragment(fragment, direction) {
            if (!this.canMergeFragment(fragment, direction)) {
                return null;
            }

            const joinOffset = value.text.length + 1;
            return {
                fragment: {
                    type,
                    data: merge(value.text, fragment)
                },
                joinOffset
            };
        }
    };
}

test("joinWithPrevious returns an opaque merged fragment and backspace cursor position", () => {
    const notebook = new NotebookController();
    notebook.setAdapters([
        createAdapter({ text: "first" }),
        createAdapter({ text: "second" })
    ]);

    const result = notebook.joinWithPrevious(1);

    assert.deepEqual(result, {
        noteIndex: 0,
        removeNoteIndex: 1,
        fragment: {
            type: "test/note",
            data: {
                text: "first\nsecond"
            }
        },
        focus: {
            noteIndex: 0,
            offset: 6
        }
    });
});

test("joinWithNext preserves the supplied delete cursor position", () => {
    const notebook = new NotebookController();
    notebook.setAdapters([
        createAdapter({ text: "first" }),
        createAdapter({ text: "second" })
    ]);

    const result = notebook.joinWithNext(0, 5);

    assert.deepEqual(result?.focus, {
        noteIndex: 0,
        offset: 5
    });
    assert.equal(result?.fragment.data.text, "first\nsecond");
});

test("join returns null when the target note rejects the source fragment", () => {
    const notebook = new NotebookController();
    notebook.setAdapters([
        createAdapter({
            text: "first",
            accepts: fragment => fragment.type === "accepted/type"
        }),
        createAdapter({
            type: "other/type",
            text: "second"
        })
    ]);

    assert.equal(notebook.joinWithPrevious(1), null);
    assert.equal(notebook.joinWithNext(0), null);
});

test("join returns null at notebook boundaries", () => {
    const notebook = new NotebookController();
    notebook.setAdapters([
        createAdapter({ text: "only" })
    ]);

    assert.equal(notebook.joinWithPrevious(0), null);
    assert.equal(notebook.joinWithNext(0), null);
});
