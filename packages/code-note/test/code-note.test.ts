/* @vitest-environment jsdom */
import { describe, expect, test } from "vitest";
import { NotebookController } from "@cobalt/notebook";
import { edit as editRichText, RICH_TEXT_NOTE_FRAGMENT_TYPE } from "@cobalt/rich-text-note";
import {
    CODE_NOTE_FRAGMENT_TYPE,
    editCodeNote,
    wrapCodeNoteValue
} from "../src/index.js";

function createCodeEditor(text: string) {
    const value = { text };
    const element = document.createElement("textarea");
    document.body.append(element);
    return {
        value,
        element,
        editor: editCodeNote(element, value)
    };
}

function createRichTextEditor(text: string) {
    const value = { text, annotations: [] };
    const element = document.createElement("div");
    document.body.append(element);
    return {
        value,
        element,
        editor: editRichText(element, value)
    };
}

describe("code note adapter", () => {
    test("uses textarea selection and updates its value", () => {
        document.body.innerHTML = "";
        const { value, element, editor } = createCodeEditor("const answer = 42;");

        editor.focus(6, 12);

        expect(document.activeElement).toBe(element);
        expect(editor.getSelection()).toEqual({ start: 6, end: 12 });

        editor.insertText(6, "final ");

        expect(value.text).toBe("const final answer = 42;");
        expect(element.value).toBe("const final answer = 42;");
    });

    test("splits and inserts opaque code fragments", () => {
        document.body.innerHTML = "";
        const { editor } = createCodeEditor("hello world");

        const split = editor.splitFragment(5);

        expect(split.before).toEqual(wrapCodeNoteValue({ text: "hello" }));
        expect(split.after).toEqual(wrapCodeNoteValue({ text: " world" }));

        expect(editor.canInsertFragment(split.after)).toBe(true);
        expect(editor.insertFragment(5, split.after)).toBe(11);
        expect(editor.getValue()).toEqual({ text: "hello world world" });
    });

    test("merges only code-note fragments", () => {
        document.body.innerHTML = "";
        const { editor } = createCodeEditor("first");
        const codeFragment = wrapCodeNoteValue({ text: "second" });
        const richTextFragment = {
            type: RICH_TEXT_NOTE_FRAGMENT_TYPE,
            data: {
                text: "second",
                annotations: []
            }
        };

        expect(editor.canMergeFragment(codeFragment, "after")).toBe(true);
        expect(editor.mergeFragment(codeFragment, "after")).toEqual({
            fragment: wrapCodeNoteValue({ text: "first\nsecond" }),
            joinOffset: 6
        });

        expect(editor.canMergeFragment(richTextFragment, "after")).toBe(false);
        expect(editor.mergeFragment(richTextFragment, "after")).toBeNull();
    });

    test("notebook join works for code notes and rejects rich-text/code joins", () => {
        document.body.innerHTML = "";
        const first = createCodeEditor("first").editor;
        const second = createCodeEditor("second").editor;
        const rich = createRichTextEditor("rich").editor;

        const notebook = new NotebookController();
        notebook.setAdapters([first, second]);

        expect(notebook.joinWithPrevious(1)).toEqual({
            noteIndex: 0,
            removeNoteIndex: 1,
            fragment: {
                type: CODE_NOTE_FRAGMENT_TYPE,
                data: { text: "first\nsecond" }
            },
            focus: {
                noteIndex: 0,
                offset: 6
            }
        });

        notebook.setAdapters([first, rich]);
        expect(notebook.joinWithNext(0)).toBeNull();

        notebook.setAdapters([rich, first]);
        expect(notebook.joinWithNext(0)).toBeNull();
    });
    test("vertical navigation preserves desired X in textarea notes", () => {
        document.body.innerHTML = "";
        const { element, editor } = createCodeEditor("abcde\nab\nabcdef");
        const notebook = new NotebookController();
        notebook.setAdapters([editor]);

        element.style.fontSize = "10px";
        element.style.lineHeight = "20px";
        element.style.padding = "0px";
        element.style.borderWidth = "0px";
        element.getBoundingClientRect = () => new DOMRect(0, 0, 120, 60);

        editor.focus(4, 4);

        expect(notebook.moveDown(0)).toBe(true);
        expect(editor.getSelection()).toEqual({ start: 8, end: 8 });

        expect(notebook.moveDown(0)).toBe(true);
        expect(editor.getSelection()).toEqual({ start: 13, end: 13 });
    });

});
