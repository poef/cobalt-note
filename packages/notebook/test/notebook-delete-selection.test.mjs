import test from "node:test";
import assert from "node:assert/strict";

import { NotebookController } from "../dist/index.js";

function createAdapter({
    type = "test/note",
    text,
    accepts = () => true
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
        deleteRange(start, end) {
            value = {
                text: value.text.slice(0, start) + value.text.slice(end)
            };
        },
        insertText(offset, text) {
            value = {
                text: value.text.slice(0, offset) + text + value.text.slice(offset)
            };
        },
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

            return {
                fragment: {
                    type,
                    data: {
                        text: value.text + "\n" + fragment.data.text
                    }
                },
                joinOffset: value.text.length + 1
            };
        }
    };
}

test("deleteSelection deletes a local selected range in-place", () => {
    const adapter = createAdapter({ text: "abcdef" });
    const notebook = new NotebookController();
    notebook.setAdapters([adapter]);
    notebook.selectRange(
        { noteIndex: 0, offset: 2 },
        { noteIndex: 0, offset: 5 }
    );

    const result = notebook.deleteSelection();

    assert.deepEqual(result, {
        focus: {
            noteIndex: 0,
            offset: 2
        }
    });
    assert.equal(adapter.getValue().text, "abf");
    assert.equal(notebook.hasSelection(), false);
});

test("deleteSelection removes a cross-note selection through opaque fragments", () => {
    const first = createAdapter({ text: "hello brave" });
    const second = createAdapter({ text: "new world" });
    const third = createAdapter({ text: "after" });
    const notebook = new NotebookController();
    notebook.setAdapters([first, second, third]);
    notebook.selectRange(
        { noteIndex: 0, offset: 5 },
        { noteIndex: 2, offset: 2 }
    );

    const result = notebook.deleteSelection();

    assert.deepEqual(result, {
        focus: {
            noteIndex: 0,
            offset: 5
        },
        replacement: {
            noteIndex: 0,
            removeNoteIndex: 2,
            fragment: {
                type: "test/note",
                data: {
                    text: "helloter"
                }
            }
        }
    });
    assert.equal(first.getValue().text, "helloter");
    assert.equal(notebook.hasSelection(), false);
});

test("deleteSelection returns null when the target note rejects the suffix fragment", () => {
    const first = createAdapter({
        text: "first",
        accepts: fragment => fragment.type === "accepted/type"
    });
    const second = createAdapter({
        type: "other/type",
        text: "second"
    });
    const notebook = new NotebookController();
    notebook.setAdapters([first, second]);
    notebook.selectRange(
        { noteIndex: 0, offset: 2 },
        { noteIndex: 1, offset: 3 }
    );

    const result = notebook.deleteSelection();

    assert.equal(result, null);
    assert.equal(first.getValue().text, "first");
    assert.equal(second.getValue().text, "second");
    assert.equal(notebook.hasSelection(), true);
});
