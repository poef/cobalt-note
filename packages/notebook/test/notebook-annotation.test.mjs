import test from "node:test";
import assert from "node:assert/strict";

import { NotebookController } from "../dist/index.js";

function createAdapter({
    text,
    supports = () => true,
    commandState = undefined
}) {
    const commands = [];

    return {
        commands,
        getType() {
            return "test/note";
        },
        getValue() {
            return { text };
        },
        setValue() {},
        getLength() {
            return text.length;
        },
        getText(start = 0, end = text.length) {
            return text.slice(start, end);
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
                type: "test/note",
                data: {
                    text: text.slice(start, end)
                }
            };
        },
        canInsertFragment() {
            return true;
        },
        insertFragment(offset, fragment) {
            text = text.slice(0, offset) + fragment.data.text + text.slice(offset);
            return offset + fragment.data.text.length;
        },
        splitFragment(offset) {
            return {
                before: this.sliceFragment(0, offset),
                after: this.sliceFragment(offset, text.length)
            };
        },
        canMergeFragment() {
            return true;
        },
        mergeFragment(fragment) {
            return {
                fragment: {
                    type: "test/note",
                    data: {
                        text: text + fragment.data.text
                    }
                },
                joinOffset: text.length
            };
        },
        canApplyCommand(command, range, value) {
            return supports(command, range, value);
        },
        getCommandState(command, offset) {
            return commandState(offset, command);
        },
        applyCommand(command, range, value) {
            commands.push({ start: range.start, end: range.end, command, value });
            return true;
        }
    };
}

test("applyCommandToSelection applies a command to each selected note range", () => {
    const first = createAdapter({ text: "hello" });
    const second = createAdapter({ text: "world" });
    const notebook = new NotebookController();
    notebook.setAdapters([first, second]);
    notebook.selectRange(
        { noteIndex: 0, offset: 2 },
        { noteIndex: 1, offset: 3 }
    );

    const result = notebook.applyCommandToSelection("strong", true);

    assert.deepEqual(result, {
        focus: {
            noteIndex: 1,
            offset: 3
        }
    });
    assert.deepEqual(first.commands, [
        { start: 2, end: 5, command: "strong", value: true }
    ]);
    assert.deepEqual(second.commands, [
        { start: 0, end: 3, command: "strong", value: true }
    ]);
    assert.equal(notebook.hasSelection(), false);
});

test("applyCommandToSelection returns null when one note cannot apply the command", () => {
    const first = createAdapter({ text: "hello" });
    const second = createAdapter({
        text: "world",
        supports: name => name !== "strong"
    });
    const notebook = new NotebookController();
    notebook.setAdapters([first, second]);
    notebook.selectRange(
        { noteIndex: 0, offset: 1 },
        { noteIndex: 1, offset: 2 }
    );

    assert.equal(notebook.applyCommandToSelection("strong", true), null);
    assert.deepEqual(first.commands, []);
    assert.deepEqual(second.commands, []);
    assert.equal(notebook.hasSelection(), true);
});

test("getSelectionCommandState reads from the selection start note", () => {
    const first = createAdapter({
        text: "hello",
        commandState(offset, name) {
            return `${name}@${offset}`;
        }
    });
    const second = createAdapter({ text: "world" });
    const notebook = new NotebookController();
    notebook.setAdapters([first, second]);
    notebook.selectRange(
        { noteIndex: 0, offset: 4 },
        { noteIndex: 1, offset: 2 }
    );

    assert.equal(notebook.getSelectionCommandState("em"), "em@4");
});
