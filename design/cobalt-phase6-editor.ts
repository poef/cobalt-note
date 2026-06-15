import { render, Fragment } from "./cobalt-phase4-render";
import {
    getSelectionRange,
    setSelectionRange,
    SelectionRange
} from "./cobalt-phase5-selection";

export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
}

function getPlainText(root: HTMLElement): string {
    return root.textContent ?? "";
}

export function edit(
    element: HTMLElement,
    fragment: Fragment
): Editor {

    const editor: Editor = {
        element,
        fragment
    };

    function rerender(
        selection?: SelectionRange | null
    ): void {
        element.innerHTML = render(fragment);

        if (selection) {
            setSelectionRange(
                element,
                selection.start,
                selection.end
            );
        }
    }

    rerender();

    element.contentEditable = "true";

    element.addEventListener(
        "keydown",
        (event: KeyboardEvent) => {

            if (event.key === "Enter") {
                event.preventDefault();
            }

        }
    );

    element.addEventListener(
        "input",
        () => {

            const selection =
                getSelectionRange(element);

            const newText =
                getPlainText(element);

            fragment.text = newText;

            rerender(selection);

        }
    );

    return editor;
}
