/* @vitest-environment jsdom */
import { afterEach, expect, test } from "vitest";
import { editImageNote } from "../src/index.js";

const editors: ReturnType<typeof editImageNote>[] = [];

afterEach(() => {
    for (const editor of editors.splice(0)) editor.destroy();
    document.body.innerHTML = "";
});

function mount(caption: string) {
    const host = document.createElement("div");
    const element = document.createElement("figure");
    host.append(element);
    document.body.append(host);
    const editor = editImageNote(element, { src: "image.png", alt: "Image", caption });
    // jsdom does not reflect contentEditable into the focusable attribute.
    element.querySelector("figcaption")!.setAttribute("contenteditable", "true");
    editors.push(editor);
    const removals: string[] = [];
    host.addEventListener("cobalt:request-remove-note", event => {
        expect(event.target).toBe(element);
        removals.push((event as CustomEvent).detail.direction);
    });
    return { element, editor, removals };
}

function key(target: HTMLElement, name: string, options: KeyboardEventInit = {}) {
    const event = new KeyboardEvent("keydown", {
        key: name, bubbles: true, cancelable: true, ...options
    });
    target.dispatchEvent(event);
    return event;
}

test.each(["", "A caption"])("requests removal from the image surface, caption %j", caption => {
    const { element, editor, removals } = mount(caption);
    editor.focus(0);
    expect(key(element, "Delete").defaultPrevented).toBe(true);
    expect(removals).toEqual(["next"]);

    editor.focus(1);
    expect(key(element, "Backspace").defaultPrevented).toBe(true);
    expect(removals).toEqual(["next", "previous"]);
    // A host that does not act on the request retains the note and its content.
    expect(element.isConnected).toBe(true);
    expect(editor.getValue().caption.text).toBe(caption);
});

test("caption editing never invokes whole-note removal", () => {
    const { element, editor, removals } = mount("A caption");
    const caption = element.querySelector("figcaption")!;
    editor.focus(editor.getLength());
    expect(document.activeElement).toBe(caption);
    key(caption, "Backspace");
    key(caption, "Delete");
    expect(removals).toEqual([]);

    caption.dispatchEvent(new InputEvent("beforeinput", {
        inputType: "deleteContentBackward", bubbles: true, cancelable: true
    }));
    expect(editor.getValue().caption.text).toBe("A captio");
    expect(removals).toEqual([]);
});

test("image-to-caption arrow navigation stays with the editor", () => {
    const { element, editor, removals } = mount("Caption");
    editor.focus(0);
    key(element, "ArrowRight");
    expect(editor.getSelection()).toEqual({ start: 1, end: 1 });
    expect(document.activeElement).toBe(element);
    key(element, "ArrowRight");
    expect(document.activeElement).toBe(element.querySelector("figcaption"));
    expect(editor.getSelection()).toEqual({ start: 1, end: 1 });
    expect(removals).toEqual([]);
});

test("modified deletion shortcuts do not remove an image note", () => {
    const { element, editor, removals } = mount("Caption");
    editor.focus(0);
    key(element, "Delete", { ctrlKey: true });
    key(element, "Delete", { metaKey: true });
    key(element, "Delete", { altKey: true });
    key(element, "Delete", { shiftKey: true });
    expect(removals).toEqual([]);
});

test("a consumed notebook shortcut does not request note removal", () => {
    const { element, editor, removals } = mount("Caption");
    element.addEventListener("keydown", event => event.preventDefault(), { capture: true });
    editor.focus(0);
    key(element, "Delete");
    expect(removals).toEqual([]);
});

test("destroy removes the keyboard listener before the element is reused", () => {
    const { element, editor, removals } = mount("Caption");
    editor.focus(0);
    editor.destroy();
    key(element, "Delete");
    expect(removals).toEqual([]);
    const next = editImageNote(element, { src: "next.png", caption: "Next" });
    editors.push(next);
    next.focus(0);
    key(element, "Delete");
    expect(removals).toEqual(["next"]);
});
