import { Fragment } from "./cobalt-phase4-render";

import {
    getSelectionRange,
    setSelectionRange
} from "./cobalt-phase5-selection";

import {
    AddAnnotationCommand,
    applyCommand
} from "./cobalt-phase6_5-commands";

import {
    defaultRegistry,
    createAnnotationTag
} from "./cobalt-phase4_5-registry";

import {
    getEffectiveState
} from "./cobalt-phase2";

export type ToggleAnnotationName =
    | "strong"
    | "em"
    | "underline";

function isAnnotationEnabled(
    fragment: Fragment,
    offset: number,
    annotation: ToggleAnnotationName
): boolean {

    const state = getEffectiveState(
        fragment.annotations,
        offset
    );

    switch (annotation) {
        case "strong":
            return state.strong;

        case "em":
            return state.em;

        case "underline":
            return state.underline;
    }
}

export function toggleAnnotation(
    fragment: Fragment,
    selection: [number, number],
    annotation: ToggleAnnotationName
): void {

    const enabled =
        isAnnotationEnabled(
            fragment,
            selection[0],
            annotation
        );

    const tag = createAnnotationTag(
        annotation,
        !enabled,
        defaultRegistry
    );

    applyCommand(
        fragment,
        new AddAnnotationCommand(
            selection,
            tag
        )
    );
}

export function installKeyboardShortcuts(
    element: HTMLElement,
    fragment: Fragment,
    rerender: () => void
): void {

    element.addEventListener(
        "keydown",
        event => {

            if (!event.ctrlKey) {
                return;
            }

            let annotation:
                ToggleAnnotationName |
                null = null;

            switch (
                event.key.toLowerCase()
            ) {

                case "b":
                    annotation = "strong";
                    break;

                case "i":
                    annotation = "em";
                    break;

                case "u":
                    annotation = "underline";
                    break;

            }

            if (!annotation) {
                return;
            }

            event.preventDefault();

            const selection =
                getSelectionRange(element);

            if (!selection) {
                return;
            }

            toggleAnnotation(
                fragment,
                [
                    selection.start,
                    selection.end
                ],
                annotation
            );

            rerender();

            setSelectionRange(
                element,
                selection.start,
                selection.end
            );
        }
    );
}
