import { createAnnotationTag, createLinkAnnotationTag } from "./registry.js";

export type ToggleAnnotationName =
    | "strong"
    | "em"
    | "underline";

export type PendingAnnotations = Record<ToggleAnnotationName, boolean>;

export interface EditorState {
    pending: PendingAnnotations;

    /**
     * undefined: no pending link intent
     * null: pending intent to disable the active link
     * string: pending intent to enable a link with this href
     */
    pendingLink: string | null | undefined;
}

export interface PendingAnnotationRange {
    start: number;
    end: number;
    tag: string;
}

export function createEditorState(): EditorState {
    return {
        pending: {
            strong: false,
            em: false,
            underline: false
        },
        pendingLink: undefined
    };
}

export function buildPendingAnnotations(
    state: EditorState,
    start: number,
    end: number
): PendingAnnotationRange[] {
    const result: PendingAnnotationRange[] = [];

    for (const name of Object.keys(state.pending) as ToggleAnnotationName[]) {
        if (!state.pending[name]) {
            continue;
        }

        result.push({
            start,
            end,
            tag: createAnnotationTag(name, true)
        });
    }

    if (state.pendingLink !== undefined) {
        result.push({
            start,
            end,
            tag: state.pendingLink === null
                ? "</a>"
                : createLinkAnnotationTag(state.pendingLink)
        });
    }

    return result;
}

export function clearPendingAnnotations(
    state: EditorState
): void {
    for (const name of Object.keys(state.pending) as ToggleAnnotationName[]) {
        state.pending[name] = false;
    }

    state.pendingLink = undefined;
}
