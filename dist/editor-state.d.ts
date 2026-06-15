export type ToggleAnnotationName = "strong" | "em" | "underline";
export type PendingAnnotations = Record<ToggleAnnotationName, boolean>;
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
