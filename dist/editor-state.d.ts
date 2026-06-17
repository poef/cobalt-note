export type ToggleAnnotationName = "strong" | "em" | "underline";
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
export declare function createEditorState(): EditorState;
export declare function buildPendingAnnotations(state: EditorState, start: number, end: number): PendingAnnotationRange[];
export declare function clearPendingAnnotations(state: EditorState): void;
