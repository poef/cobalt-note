import { AnnotationRegistry, createAnnotationTag, defaultRegistry } from "./registry.js";

/**
 * Pending annotation values are one-shot overrides for the next inserted text.
 *
 * undefined = no pending override
 * true      = make the next inserted text have this annotation
 * false     = make the next inserted text not have this annotation
 */
export type PendingAnnotations = Record<string, boolean | undefined>;

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
    end: number,
    registry: AnnotationRegistry = defaultRegistry
): PendingAnnotationRange[] {
    const result: PendingAnnotationRange[] = [];

    for (const name of Object.keys(state.pending)) {
        const enabled = state.pending[name];

        if (enabled === undefined) {
            continue;
        }

        result.push({
            start,
            end,
            tag: createAnnotationTag(name, enabled, registry)
        });
    }

    return result;
}

export function clearPendingAnnotations(
    state: EditorState
): void {
    for (const name of Object.keys(state.pending)) {
        delete state.pending[name];
    }
}
