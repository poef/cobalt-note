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
            return { text: value.text };
        },
        setValue(nextValue) {
            value = { text: nextValue.text };
        },
        getLength() {
            return value.text.length;
        },
        getText(start = 0, end = value.text.length) {
            return value.text.slice(start, end);
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

test("copySelection returns plain text and opaque fragments", () => {
    const notebook = new NotebookController();
    notebook.setAdapters([
        createAdapter({ text: "hello brave" }),
        createAdapter({ text: "new world" })
    ]);
    notebook.selectRange(
        { noteIndex: 0, offset: 6 },
        { noteIndex: 1, offset: 3 }
    );

    assert.deepEqual(notebook.copySelection(), {
        text: "brave\nnew",
        fragments: [
            { type: "test/note", data: { text: "brave" } },
            { type: "test/note", data: { text: "new" } }
        ]
    });
});

test("cutSelection copies and deletes the selected content", () => {
    const first = createAdapter({ text: "hello brave" });
    const second = createAdapter({ text: "new world" });
    const notebook = new NotebookController();
    notebook.setAdapters([first, second]);
    notebook.selectRange(
        { noteIndex: 0, offset: 5 },
        { noteIndex: 1, offset: 3 }
    );

    const result = notebook.cutSelection();

    assert.equal(result.clipboard.text, " brave\nnew");
    assert.deepEqual(result.deleteResult.focus, { noteIndex: 0, offset: 5 });
    assert.equal(first.getValue().text, "hello world");
});

test("pasteFragments inserts a single fragment in-place", () => {
    const adapter = createAdapter({ text: "hello world" });
    const notebook = new NotebookController();
    notebook.setAdapters([adapter]);

    const result = notebook.pasteFragments(0, 6, [
        { type: "test/note", data: { text: "brave " } }
    ]);

    assert.deepEqual(result, {
        focus: { noteIndex: 0, offset: 12 }
    });
    assert.equal(adapter.getValue().text, "hello brave world");
});

test("pasteFragments returns replacement fragments for multi-note paste", () => {
    const adapter = createAdapter({ text: "hello world" });
    const notebook = new NotebookController();
    notebook.setAdapters([adapter]);

    const result = notebook.pasteFragments(0, 6, [
        { type: "test/note", data: { text: "one" } },
        { type: "test/note", data: { text: "two" } }
    ]);

    assert.deepEqual(result, {
        focus: { noteIndex: 1, offset: 3 },
        replacement: {
            noteIndex: 0,
            removeNoteIndex: 0,
            fragments: [
                { type: "test/note", data: { text: "hello one" } },
                { type: "test/note", data: { text: "twoworld" } }
            ]
        }
    });
    assert.equal(adapter.getValue().text, "hello world");
});

test("replaceSelectionWithFragments combines cross-note delete and paste", () => {
    const first = createAdapter({ text: "hello brave" });
    const second = createAdapter({ text: "new world" });
    const notebook = new NotebookController();
    notebook.setAdapters([first, second]);
    notebook.selectRange(
        { noteIndex: 0, offset: 5 },
        { noteIndex: 1, offset: 3 }
    );

    const result = notebook.replaceSelectionWithFragments([
        { type: "test/note", data: { text: " inserted " } }
    ]);

    assert.deepEqual(result, {
        focus: { noteIndex: 0, offset: 15 },
        replacement: {
            noteIndex: 0,
            removeNoteIndex: 1,
            fragments: [
                { type: "test/note", data: { text: "hello inserted  world" } }
            ]
        }
    });
});

test("pasteFragments returns null when the target rejects a fragment", () => {
    const adapter = createAdapter({
        text: "hello",
        accepts: fragment => fragment.type === "accepted/type"
    });
    const notebook = new NotebookController();
    notebook.setAdapters([adapter]);

    const result = notebook.pasteFragments(0, 2, [
        { type: "other/type", data: { text: "x" } }
    ]);

    assert.equal(result, null);
    assert.equal(adapter.getValue().text, "hello");
});
