export interface SelectionRange {
    start: number;
    end: number;
}
export interface DomPosition {
    node: Node;
    offset: number;
}
export interface CaretVisualPosition {
    rect: DOMRect;
    offset: number;
}
export declare function getOffset(root: HTMLElement, targetNode: Node, targetOffset: number): number;
export declare function getDomPosition(root: HTMLElement, offset: number): DomPosition;
export declare function getSelectionRange(root: HTMLElement): SelectionRange | null;
export declare function setSelectionRange(root: HTMLElement, start: number, end: number): boolean;
export declare function getCaretClientRect(root: HTMLElement, offset: number): DOMRect | null;
export declare function getCurrentCaretClientRect(root: HTMLElement): DOMRect | null;
export declare function isOffsetOnFirstVisualLine(root: HTMLElement, offset: number, tolerance?: number): boolean;
export declare function isOffsetOnLastVisualLine(root: HTMLElement, offset: number, textLength: number, tolerance?: number): boolean;
export declare function getOffsetAtPoint(root: HTMLElement, x: number, y: number): number;
