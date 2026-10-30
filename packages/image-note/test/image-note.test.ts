/* @vitest-environment jsdom */
import { describe, expect, test } from "vitest";
import { NotebookController } from "@cobalt/notebook";
import { editCodeNote } from "@cobalt/code-note";
import {
    editImageNote,
    IMAGE_NOTE_FRAGMENT_TYPE,
    wrapImageNoteValue
} from "../src/index.js";

const IMAGE = {
    src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    alt: "Tiny pixel",
    caption: "An image"
};

function createImageEditor(value = IMAGE) {
    const noteValue = { ...value };
    const element = document.createElement("figure");
    document.body.append(element);
    return {
        value: noteValue,
        element,
        editor: editImageNote(element, noteValue)
    };
}

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

describe("image note adapter", () => {
    test("renders an image with an embedded rich-text caption", () => {
        document.body.innerHTML = "";
        const { element, editor } = createImageEditor();

        expect(editor.getType()).toBe(IMAGE_NOTE_FRAGMENT_TYPE);
        expect(editor.getLength()).toBe(1 + "An image".length);
        expect(editor.getText()).toBe("Tiny pixel\nAn image");
        expect(element.querySelector("img")?.getAttribute("alt")).toBe("Tiny pixel");
        expect(element.querySelector("figcaption")?.textContent).toBe("An image");
    });

    test("uses offset 0 before the image, offset 1 after the image, then caption offsets", () => {
        document.body.innerHTML = "";
        const { element, editor } = createImageEditor();
        const image = element.querySelector("img")!;
        const caption = element.querySelector("figcaption")!;

        element.getBoundingClientRect = () => new DOMRect(10, 20, 100, 80);
        image.getBoundingClientRect = () => new DOMRect(10, 20, 100, 50);
        caption.getBoundingClientRect = () => new DOMRect(10, 72, 100, 20);

        editor.focus(0, 0);
        expect(document.activeElement).toBe(element);
        expect(editor.getSelection()).toEqual({ start: 0, end: 0 });
        expect(editor.getOffsetAtPoint(20, 30)).toBe(0);
        expect(editor.getOffsetAtPoint(90, 30)).toBe(1);
        expect(editor.getCaretClientRect(1)).toEqual(new DOMRect(110, 20, 1, 50));
    });

    test("declines split and merge operations", () => {
        document.body.innerHTML = "";
        const { editor } = createImageEditor();
        const code = createCodeEditor("code").editor.sliceFragment(0, 4);
        const image = wrapImageNoteValue(IMAGE);

        expect(editor.canSplit?.(0)).toBe(false);
        expect(editor.canMergeFragment(image, "after")).toBe(false);
        expect(editor.canMergeFragment(code, "after")).toBe(false);
        expect(editor.mergeFragment(image, "after")).toBeNull();
    });

    test("notebook rejects joins involving image notes", () => {
        document.body.innerHTML = "";
        const image = createImageEditor().editor;
        const code = createCodeEditor("code").editor;
        const notebook = new NotebookController();

        notebook.setAdapters([image, code]);
        expect(notebook.joinWithNext(0)).toBeNull();

        notebook.setAdapters([code, image]);
        expect(notebook.joinWithNext(0)).toBeNull();
    });

    test("notebook refuses multi-fragment paste into unsplittable image notes", () => {
        document.body.innerHTML = "";
        const image = createImageEditor().editor;
        const notebook = new NotebookController();
        const fragments = [image.sliceFragment(1, 3), image.sliceFragment(3, 5)];
        const before = image.getValue();

        notebook.setAdapters([image]);
        expect(fragments.every(fragment => image.canInsertFragment(fragment))).toBe(true);
        expect(notebook.pasteFragments(0, 2, fragments)).toBeNull();
        expect(image.getValue()).toEqual(before);
    });

    test("can edit the caption through rich-text commands", () => {
        document.body.innerHTML = "";
        const { value, editor } = createImageEditor();
        const notebook = new NotebookController();
        notebook.setAdapters([editor]);
        notebook.selectRange({ noteIndex: 0, offset: 1 }, { noteIndex: 0, offset: 3 });

        expect(notebook.canApplyCommandToSelection("strong")).toBe(true);
        expect(notebook.applyCommandToSelection("strong")).toEqual({
            focus: { noteIndex: 0, offset: 3 }
        });
        expect(typeof value.caption).toBe("object");
        expect((value.caption as { annotations: unknown[] }).annotations).toHaveLength(1);
    });

    test("supports image-specific commands without notebook knowing image data", () => {
        document.body.innerHTML = "";
        const { value, editor } = createImageEditor();
        const notebook = new NotebookController();
        notebook.setAdapters([editor]);
        notebook.selectRange({ noteIndex: 0, offset: 0 }, { noteIndex: 0, offset: 1 });

        expect(notebook.canApplyCommandToSelection("set-caption", "Updated")).toBe(true);
        expect(notebook.applyCommandToSelection("set-caption", "Updated")).toEqual({
            focus: { noteIndex: 0, offset: 1 }
        });
        expect((value.caption as { text: string }).text).toBe("Updated");
    });
});
