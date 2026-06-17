import {
    getDomPosition,
    getOffset,
    getSelectionRange,
    setSelectionRange
} from "../src/selection.js";

describe("DOM selection mapping", () => {
    test("maps DOM positions to plain text offsets", () => {
        document.body.innerHTML = '<div id="root"><strong>hel</strong><em>lo</em></div>';
        const root = document.getElementById("root") as HTMLElement;
        const emText = root.querySelector("em")!.firstChild!;

        expect(getOffset(root, emText, 1)).toBe(4);
    });

    test("sets and reads a selection range using character offsets", () => {
        document.body.innerHTML = '<div id="root"><strong>hel</strong><em>lo</em></div>';
        const root = document.getElementById("root") as HTMLElement;

        expect(setSelectionRange(root, 1, 4)).toBe(true);
        expect(getSelectionRange(root)).toEqual({
            start: 1,
            end: 4
        });
    });

    test("maps a text offset back to a DOM position", () => {
        document.body.innerHTML = '<div id="root"><strong>hel</strong><em>lo</em></div>';
        const root = document.getElementById("root") as HTMLElement;
        const position = getDomPosition(root, 4);

        expect(position.node.textContent).toBe("lo");
        expect(position.offset).toBe(1);
    });
});

test("sentinel text nodes do not contribute to cobalt offsets", () => {
    document.body.innerHTML = '<div id="root">hello\n<span data-cobalt-sentinel="true">\u200B</span></div>';
    const root = document.getElementById("root") as HTMLElement;
    const sentinel = root.querySelector("span")!.firstChild!;

    expect(getOffset(root, sentinel, 1)).toBe(6);
    expect(getDomPosition(root, 6).node.textContent).toBe("hello\n");
    expect(getDomPosition(root, 6).offset).toBe(6);
});
