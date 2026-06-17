import { EditorState } from "./editor-state.js";
import { Fragment } from "./fragment.js";
import { getSelectionRange } from "@cobalt/note-core";
export declare const RICH_TEXT_NOTE_FRAGMENT_TYPE = "cobalt.rich-text";
export interface RichTextNotebookFragment {
    type: typeof RICH_TEXT_NOTE_FRAGMENT_TYPE;
    data: Fragment;
}
export interface RichTextNotebookMergeResult {
    fragment: RichTextNotebookFragment;
    joinOffset: number;
}
export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
    getType(): typeof RICH_TEXT_NOTE_FRAGMENT_TYPE;
    getValue(): Fragment;
    setValue(value: unknown): void;
    getLength(): number;
    getText(start?: number, end?: number): string;
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
    deleteRange(start: number, end: number): void;
    insertText(offset: number, text: string): void;
    sliceFragment(start: number, end: number): RichTextNotebookFragment;
    canInsertFragment(fragment: {
        type: string;
        data: unknown;
    }): boolean;
    insertFragment(offset: number, fragment: {
        type: string;
        data: unknown;
    }): number;
    splitFragment(offset: number): {
        before: RichTextNotebookFragment;
        after: RichTextNotebookFragment;
    };
    canMergeFragment(fragment: {
        type: string;
        data: unknown;
    }, direction: "before" | "after"): boolean;
    mergeFragment(fragment: {
        type: string;
        data: unknown;
    }, direction: "before" | "after"): RichTextNotebookMergeResult | null;
    canApplyCommand(command: string, range: {
        start: number;
        end: number;
    }, value?: unknown): boolean;
    getCommandState(command: string, offset: number): unknown;
    applyCommand(command: string, range: {
        start: number;
        end: number;
    }, value?: unknown): boolean;
    destroy(): void;
}
export declare function edit(element: HTMLElement, fragment: Fragment): Editor;
