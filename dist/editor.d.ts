import { EditorState } from "./editor-state.js";
import { Fragment } from "./fragment.js";
export interface EditorSplitEvent {
    editor: Editor;
    fragment: Fragment;
    offset: number;
}
export interface EditorOptions {
    onSplit?: (event: EditorSplitEvent) => void;
}
export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
    focus(start?: number, end?: number): void;
    destroy(): void;
}
export declare function edit(element: HTMLElement, fragment: Fragment, options?: EditorOptions): Editor;
