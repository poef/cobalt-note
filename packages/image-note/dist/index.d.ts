import type { NotebookNoteAdapter, NotebookNoteFragment } from "@cobalt/notebook";
import { type Fragment } from "@cobalt/rich-text-note";
export declare const IMAGE_NOTE_FRAGMENT_TYPE = "image";
export interface ImageNoteValue {
    src: string;
    alt?: string;
    caption?: string | Fragment;
}
export interface NormalizedImageNoteValue {
    src: string;
    alt?: string;
    caption: Fragment;
}
export interface ImageNoteFragment {
    type: typeof IMAGE_NOTE_FRAGMENT_TYPE;
    data: NormalizedImageNoteValue;
}
export interface ImageNoteEditor extends NotebookNoteAdapter {
    element: HTMLElement;
    destroy(): void;
}
export interface ImageNoteOptions {
    className?: string;
}
export declare function editImageNote(element: HTMLElement, value: ImageNoteValue, options?: ImageNoteOptions): ImageNoteEditor;
export declare function isImageNoteValue(value: unknown): value is ImageNoteValue;
export declare function isImageNoteFragment(fragment: NotebookNoteFragment): fragment is ImageNoteFragment;
export declare function wrapImageNoteValue(value: ImageNoteValue): ImageNoteFragment;
