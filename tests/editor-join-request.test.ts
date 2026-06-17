import { COBALT_JOIN_REQUEST_EVENT, edit, Fragment, JoinRequestDetail } from "../src/index.js";

function createEditor(fragment: Fragment) {
    document.body.innerHTML = "";
    const element = document.createElement("div");
    document.body.append(element);
    const editor = edit(element, fragment);
    return { element, editor };
}

describe("editor join request events", () => {
    test("Backspace at the start requests a backward join", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: []
        };

        const { element, editor } = createEditor(fragment);
        editor.focus(0, 0);

        const requests: JoinRequestDetail[] = [];

        element.addEventListener(COBALT_JOIN_REQUEST_EVENT, event => {
            requests.push((event as CustomEvent<JoinRequestDetail>).detail);
            event.preventDefault();
        });

        element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "deleteContentBackward"
        }));

        expect(requests).toHaveLength(1);
        expect(requests[0].direction).toBe("backward");
        expect(fragment.text).toBe("hello");
    });

    test("Delete at the end requests a forward join", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: []
        };

        const { element, editor } = createEditor(fragment);
        editor.focus(5, 5);

        const requests: JoinRequestDetail[] = [];

        element.addEventListener(COBALT_JOIN_REQUEST_EVENT, event => {
            requests.push((event as CustomEvent<JoinRequestDetail>).detail);
            event.preventDefault();
        });

        element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "deleteContentForward"
        }));

        expect(requests).toHaveLength(1);
        expect(requests[0].direction).toBe("forward");
        expect(fragment.text).toBe("hello");
    });

    test("Backspace inside a note does not request a join", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: []
        };

        const { element, editor } = createEditor(fragment);
        editor.focus(3, 3);

        let requests = 0;

        element.addEventListener(COBALT_JOIN_REQUEST_EVENT, event => {
            requests += 1;
            event.preventDefault();
        });

        element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "deleteContentBackward"
        }));

        expect(requests).toBe(0);
        expect(fragment.text).toBe("helo");
    });
});
