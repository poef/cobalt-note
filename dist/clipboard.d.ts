import { Fragment } from "./fragment.js";
export declare const COBALT_CLIPBOARD_MIME = "application/x-cobalt-fragment+json";
export declare function writeFragmentToClipboard(clipboardData: DataTransfer, fragment: Fragment): void;
export declare function readFragmentFromClipboard(clipboardData: DataTransfer): Fragment;
export declare function getClipboardFragment(fragment: Fragment, start: number, end: number): Fragment;
