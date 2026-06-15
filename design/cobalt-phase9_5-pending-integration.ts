import {
    EditorState,
    createEditorState,
    togglePendingAnnotation,
    buildPendingAnnotations
} from "./cobalt-phase9-pending-annotations";

import {
    AddAnnotationCommand,
    InsertTextCommand,
    applyCommands,
    Command
} from "./cobalt-phase6_5-commands";

import {
    getSelectionRange
} from "./cobalt-phase5-selection";

import { Fragment } from "./cobalt-phase4-render";

export function handleCollapsedToggle(
    state: EditorState,
    fragment: Fragment,
    offset: number,
    annotation: "strong" | "em" | "underline",
    currentlyEnabled: boolean
): void {

    state.pending[annotation] =
        !currentlyEnabled;
}

export function buildInsertCommands(
    state: EditorState,
    offset: number,
    text: string
): Command[] {

    const commands: Command[] = [];

    commands.push(
        new InsertTextCommand(
            offset,
            text
        )
    );

    const pendingAnnotations =
        buildPendingAnnotations(
            state,
            offset,
            offset + text.length
        );

    for (const annotation of pendingAnnotations) {
        commands.push(
            new AddAnnotationCommand(
                [
                    annotation.start,
                    annotation.end
                ],
                annotation.tag
            )
        );
    }

    if (pendingAnnotations.length > 0) {
        state.pending.strong = false;
        state.pending.em = false;
        state.pending.underline = false;
    }

    return commands;
}

export function applyInsertWithPendingAnnotations(
    fragment: Fragment,
    state: EditorState,
    offset: number,
    text: string
): void {

    applyCommands(
        fragment,
        buildInsertCommands(
            state,
            offset,
            text
        )
    );

}
