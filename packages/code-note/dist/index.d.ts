import type { NotebookNoteAdapter, NotebookNoteFragment } from "@cobalt/notebook";
export declare const CODE_NOTE_FRAGMENT_TYPE = "text/code";
export interface CodeNoteValue {
    text: string;
}
export interface CodeNoteFragment {
    type: typeof CODE_NOTE_FRAGMENT_TYPE;
    data: CodeNoteValue;
}
export interface CodeNoteEditor extends NotebookNoteAdapter {
    element: HTMLTextAreaElement;
    destroy(): void;
}
export interface CodeNoteOptions {
    className?: string;
}
export declare function editCodeNote(element: HTMLTextAreaElement, value: CodeNoteValue, options?: CodeNoteOptions): CodeNoteEditor;
export declare function autoGrow(textarea: HTMLTextAreaElement): void;
export declare function isCodeNoteValue(value: unknown): value is CodeNoteValue;
export declare function isCodeNoteFragment(fragment: NotebookNoteFragment): fragment is CodeNoteFragment;
export declare function wrapCodeNoteValue(value: CodeNoteValue): CodeNoteFragment;
