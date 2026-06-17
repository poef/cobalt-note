/* @vitest-environment jsdom */
import { describe, expect, it, test } from "vitest";
import { edit, Fragment } from "../src/index.js";

function createEditor(fragment: Fragment) {
    document.body.innerHTML = "";
    const element = document.createElement("div");
    document.body.append(element);
    const editor = edit(element, fragment);
    return { element, editor };
}

describe("single-note boundary delete behavior", () => {
    test("Backspace at the start leaves the fragment unchanged", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: []
        };

        const { element, editor } = createEditor(fragment);
        editor.focus(0, 0);

        element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "deleteContentBackward"
        }));

        expect(fragment.text).toBe("hello");
    });

    test("Delete at the end leaves the fragment unchanged", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: []
        };

        const { element, editor } = createEditor(fragment);
        editor.focus(5, 5);

        element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "deleteContentForward"
        }));

        expect(fragment.text).toBe("hello");
    });

    test("Backspace inside a note still deletes one character", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: []
        };

        const { element, editor } = createEditor(fragment);
        editor.focus(3, 3);

        element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "deleteContentBackward"
        }));

        expect(fragment.text).toBe("helo");
    });
});
