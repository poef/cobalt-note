import { Fragment, render } from "./cobalt-phase4-render";

import {
    createEditorState,
    EditorState
} from "./cobalt-phase9-pending-annotations";

import {
    getSelectionRange,
    setSelectionRange
} from "./cobalt-phase5-selection";

import {
    applyCommands,
    AddAnnotationCommand,
    DeleteRangeCommand,
    InsertTextCommand
} from "./cobalt-phase6_5-commands";

import {
    buildInsertCommands
} from "./cobalt-phase9_5-pending-integration";

import {
    toggleAnnotation
} from "./cobalt-phase8-shortcuts";

export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
}

export function edit(
    element: HTMLElement,
    fragment: Fragment
): Editor {

    const state = createEditorState();

    function rerender(
        start?: number,
        end?: number
    ): void {

        element.innerHTML = render(fragment);

        if (
            start !== undefined &&
            end !== undefined
        ) {
            setSelectionRange(
                element,
                start,
                end
            );
        }
    }

    function handleShortcut(
        annotation: "strong" | "em" | "underline"
    ): void {

        const selection =
            getSelectionRange(element);

        if (!selection) {
            return;
        }

        if (selection.start !== selection.end) {

            toggleAnnotation(
                fragment,
                [
                    selection.start,
                    selection.end
                ],
                annotation
            );

        } else {

            state.pending[annotation] =
                !state.pending[annotation];

        }

        rerender(
            selection.start,
            selection.end
        );
    }

    element.contentEditable = "true";

    rerender();

    element.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                event.preventDefault();
                return;
            }

            if (!event.ctrlKey) {
                return;
            }

            switch (
                event.key.toLowerCase()
            ) {

                case "b":
                    event.preventDefault();
                    handleShortcut("strong");
                    break;

                case "i":
                    event.preventDefault();
                    handleShortcut("em");
                    break;

                case "u":
                    event.preventDefault();
                    handleShortcut("underline");
                    break;

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

            const commands = [];

            switch (e.inputType) {

                case "insertText":
                case "insertFromPaste": {

                    event.preventDefault();

                    if (
                        selection.start !==
                        selection.end
                    ) {

                        commands.push(
                            new DeleteRangeCommand(
                                selection.start,
                                selection.end
                            )
                        );

                    }

                    commands.push(
                        ...buildInsertCommands(
                            state,
                            selection.start,
                            e.data ?? ""
                        )
                    );

                    applyCommands(
                        fragment,
                        commands
                    );

                    const caret =
                        selection.start +
                        (e.data?.length ?? 0);

                    rerender(
                        caret,
                        caret
                    );

                    break;
                }

                case "deleteContentBackward": {

                    event.preventDefault();

                    if (
                        selection.start !==
                        selection.end
                    ) {

                        commands.push(
                            new DeleteRangeCommand(
                                selection.start,
                                selection.end
                            )
                        );

                    } else if (
                        selection.start > 0
                    ) {

                        commands.push(
                            new DeleteRangeCommand(
                                selection.start - 1,
                                selection.start
                            )
                        );

                    }

                    applyCommands(
                        fragment,
                        commands
                    );

                    const caret =
                        selection.start ===
                        selection.end
                            ? Math.max(
                                0,
                                selection.start - 1
                            )
                            : selection.start;

                    rerender(
                        caret,
                        caret
                    );

                    break;
                }

            }

        }
    );

    return {
        element,
        fragment,
        state
    };
}
