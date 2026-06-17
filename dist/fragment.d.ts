export interface Annotation {
    range: [number, number];
    tag: string;
    order: number;
}
export interface Fragment {
    text: string;
    annotations: Annotation[];
}
export declare function getNextOrder(fragment: Fragment): number;
export declare function addAnnotation(fragment: Fragment, range: [number, number], tag: string): Annotation | null;
export interface InsertTextOptions {
    growAtEnd?: boolean;
}
export declare function insertText(fragment: Fragment, offset: number, text: string, options?: InsertTextOptions): void;
export declare function deleteRange(fragment: Fragment, startOffset: number, endOffset: number): void;
