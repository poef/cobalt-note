import { EditorState } from "./editor-state.js";
import { Fragment } from "./fragment.js";
export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
    destroy(): void;
}
export declare function edit(element: HTMLElement, fragment: Fragment): Editor;
