import { EditorState } from "./editor-state.js";
import { Fragment } from "./fragment.js";
import { getSelectionRange, SelectionRange } from "./selection.js";
export declare const COBALT_JOIN_REQUEST_EVENT = "cobalt:joinrequest";
export type JoinDirection = "backward" | "forward";
export interface JoinRequestDetail {
    direction: JoinDirection;
    editor: Editor;
    selection: SelectionRange;
}
export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
    focus(start?: number, end?: number): void;
    getSelection(): ReturnType<typeof getSelectionRange>;
    destroy(): void;
}
export declare function edit(element: HTMLElement, fragment: Fragment): Editor;
