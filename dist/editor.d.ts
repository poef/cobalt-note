import { EditorState } from "./editor-state.js";
import { Fragment } from "./fragment.js";
import { getSelectionRange } from "./selection.js";
export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
    focus(start?: number, end?: number): void;
    getSelection(): ReturnType<typeof getSelectionRange>;
    getCaretClientRect(offset?: number): DOMRect | null;
    isCaretOnFirstVisualLine(): boolean;
    isCaretOnLastVisualLine(): boolean;
    focusNearestPoint(x: number, y: number): void;
    getOffsetAtPoint(x: number, y: number): number;
    getWordRangeAtPoint(x: number, y: number): NonNullable<ReturnType<typeof getSelectionRange>>;
    getParagraphRangeAtPoint(x: number, y: number): NonNullable<ReturnType<typeof getSelectionRange>>;
    getClientRect(): DOMRect;
    showSelectionRanges(ranges: ReturnType<typeof getSelectionRange>[], active?: boolean): void;
    clearSelectionRanges(): void;
    destroy(): void;
}
export declare function edit(element: HTMLElement, fragment: Fragment): Editor;
