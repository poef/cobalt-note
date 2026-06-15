import { render, Fragment } from "./cobalt-phase4-render";
import {
    getSelectionRange,
    setSelectionRange
} from "./cobalt-phase5-selection";

import {
    Command,
    InsertTextCommand,
    DeleteRangeCommand,
    applyCommands
} from "./cobalt-phase6_5-commands";

export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
}

function rerender(
    element: HTMLElement,
    fragment: Fragment,
    selectionStart: number,
    selectionEnd: number
): void {
    element.innerHTML = render(fragment);

    setSelectionRange(
        element,
        selectionStart,
        selectionEnd
    );
}

function buildInputCommands(
    inputType: string,
    selectionStart: number,
    selectionEnd: number,
    data: string | null
): Command[] {

    const commands: Command[] = [];

    switch (inputType) {

        case "insertText":
        case "insertFromPaste": {

            if (selectionStart !== selectionEnd) {
                commands.push(
                    new DeleteRangeCommand(
                        selectionStart,
                        selectionEnd
                    )
                );
            }

            if (data && data.length > 0) {
                commands.push(
                    new InsertTextCommand(
                        selectionStart,
                        data
                    )
                );
            }

            break;
        }

        case "deleteContentBackward": {

            if (selectionStart !== selectionEnd) {
                commands.push(
                    new DeleteRangeCommand(
                        selectionStart,
                        selectionEnd
                    )
                );
            } else if (selectionStart > 0) {
                commands.push(
                    new DeleteRangeCommand(
                        selectionStart - 1,
                        selectionStart
                    )
                );
            }

            break;
        }

        case "deleteContentForward": {

            if (selectionStart !== selectionEnd) {
                commands.push(
                    new DeleteRangeCommand(
                        selectionStart,
                        selectionEnd
                    )
                );
            } else {
                commands.push(
                    new DeleteRangeCommand(
                        selectionStart,
                        selectionStart + 1
                    )
                );
            }

            break;
        }

    }

    return commands;
}

function getNextCaretPosition(
    inputType: string,
    selectionStart: number,
    selectionEnd: number,
    data: string | null
): number {

    switch (inputType) {

        case "insertText":
        case "insertFromPaste":
            return selectionStart + (data?.length ?? 0);

        case "deleteContentBackward":
            return selectionStart === selectionEnd
                ? Math.max(0, selectionStart - 1)
                : selectionStart;

        case "deleteContentForward":
            return selectionStart;

        default:
            return selectionStart;
    }
}

export function edit(
    element: HTMLElement,
    fragment: Fragment
): Editor {

    element.contentEditable = "true";
    element.innerHTML = render(fragment);

    element.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                event.preventDefault();
            }

        }
    );

    element.addEventListener(
        "beforeinput",
        event => {

            const e = event as InputEvent;

            const selection =
                getSelectionRange(element);

            if (!selection) {
                return;
            }

            const commands =
                buildInputCommands(
                    e.inputType,
                    selection.start,
                    selection.end,
                    e.data
                );

            if (commands.length === 0) {
                return;
            }

            event.preventDefault();

            applyCommands(
                fragment,
                commands
            );

            const caret =
                getNextCaretPosition(
                    e.inputType,
                    selection.start,
                    selection.end,
                    e.data
                );

            rerender(
                element,
                fragment,
                caret,
                caret
            );

        }
    );

    return {
        element,
        fragment
    };
}
