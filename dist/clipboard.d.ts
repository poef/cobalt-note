import { Fragment } from "./fragment.js";
export declare const COBALT_CLIPBOARD_MIME = "application/x-cobalt-fragment+json";
export declare const COBALT_NOTEBOOK_CLIPBOARD_MIME = "application/x-cobalt-notebook-fragments+json";
export declare function writeFragmentToClipboard(clipboardData: DataTransfer, fragment: Fragment): void;
export declare function writeFragmentsToClipboard(clipboardData: DataTransfer, fragments: Fragment[]): void;
export declare function readFragmentFromClipboard(clipboardData: DataTransfer): Fragment;
export declare function readFragmentsFromClipboard(clipboardData: DataTransfer): Fragment[];
export declare function getClipboardFragment(fragment: Fragment, start: number, end: number): Fragment;
