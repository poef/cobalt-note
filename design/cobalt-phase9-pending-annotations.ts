export interface PendingAnnotations {
    strong: boolean;
    em: boolean;
    underline: boolean;
}

export interface EditorState {
    pending: PendingAnnotations;
}

export function createEditorState(): EditorState {
    return {
        pending: {
            strong: false,
            em: false,
            underline: false
        }
    };
}

export function togglePendingAnnotation(
    state: EditorState,
    annotation: keyof PendingAnnotations
): boolean {

    state.pending[annotation] =
        !state.pending[annotation];

    return state.pending[annotation];
}

export function clearPendingAnnotations(
    state: EditorState
): void {

    state.pending.strong = false;
    state.pending.em = false;
    state.pending.underline = false;

}

export function hasPendingAnnotations(
    state: EditorState
): boolean {

    return (
        state.pending.strong ||
        state.pending.em ||
        state.pending.underline
    );

}

export interface PendingAnnotationRange {
    start: number;
    end: number;
    tag: string;
}

export function buildPendingAnnotations(
    state: EditorState,
    start: number,
    end: number
): PendingAnnotationRange[] {

    const result: PendingAnnotationRange[] = [];

    if (state.pending.strong) {
        result.push({
            start,
            end,
            tag: "<strong>"
        });
    }

    if (state.pending.em) {
        result.push({
            start,
            end,
            tag: "<em>"
        });
    }

    if (state.pending.underline) {
        result.push({
            start,
            end,
            tag: "<u>"
        });
    }

    return result;
}
