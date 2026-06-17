import { EditorState } from "./editor-state.js";
import { Fragment } from "./fragment.js";
import { getSelectionRange } from "./selection.js";
export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
    focus(start?: number, end?: number): void;
    getSelection(): ReturnType<typeof getSelectionRange>;
    destroy(): void;
}
export declare function edit(element: HTMLElement, fragment: Fragment): Editor;
