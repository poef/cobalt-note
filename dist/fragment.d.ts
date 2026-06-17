export interface Annotation {
    range: [number, number];
    tag: string;
    order: number;
}
export interface Fragment {
    text: string;
    annotations: Annotation[];
}
export interface SplitFragmentResult {
    before: Fragment;
    after: Fragment;
}
export interface JoinFragmentsResult {
    fragment: Fragment;
    joinOffset: number;
}
export declare function getNextOrder(fragment: Fragment): number;
export declare function addAnnotation(fragment: Fragment, range: [number, number], tag: string): Annotation | null;
export interface InsertTextOptions {
    growAtEnd?: boolean;
}
export declare function insertText(fragment: Fragment, offset: number, text: string, options?: InsertTextOptions): void;
export declare function deleteRange(fragment: Fragment, startOffset: number, endOffset: number): void;
export declare function splitFragment(fragment: Fragment, offset: number): SplitFragmentResult;
export declare function joinFragments(first: Fragment, second: Fragment): JoinFragmentsResult;
export declare function mergeAdjacentMatchingAnnotations(annotations: Annotation[]): Annotation[];
