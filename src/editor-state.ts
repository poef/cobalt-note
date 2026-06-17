import { createAnnotationTag } from "./registry.js";

export type ToggleAnnotationName =
    | "strong"
    | "em"
    | "underline";

/**
 * Pending annotation values are one-shot overrides for the next inserted text.
 *
 * undefined = no pending override
 * true      = make the next inserted text have this annotation
 * false     = make the next inserted text not have this annotation
 */
export type PendingAnnotations = Partial<Record<ToggleAnnotationName, boolean>>;

export interface EditorState {
    pending: PendingAnnotations;
}

export interface PendingAnnotationRange {
    start: number;
    end: number;
    tag: string;
}

export function createEditorState(): EditorState {
    return {
        pending: {}
    };
}

export function buildPendingAnnotations(
    state: EditorState,
    start: number,
    end: number
): PendingAnnotationRange[] {
    const result: PendingAnnotationRange[] = [];

    for (const name of Object.keys(state.pending) as ToggleAnnotationName[]) {
        const enabled = state.pending[name];

        if (enabled === undefined) {
            continue;
        }

        result.push({
            start,
            end,
            tag: createAnnotationTag(name, enabled)
        });
    }

    return result;
}

export function clearPendingAnnotations(
    state: EditorState
): void {
    for (const name of Object.keys(state.pending) as ToggleAnnotationName[]) {
        delete state.pending[name];
    }
}
