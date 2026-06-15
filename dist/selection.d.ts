export interface SelectionRange {
    start: number;
    end: number;
}
export interface DomPosition {
    node: Node;
    offset: number;
}
export declare function getOffset(root: HTMLElement, targetNode: Node, targetOffset: number): number;
export declare function getDomPosition(root: HTMLElement, offset: number): DomPosition;
export declare function getSelectionRange(root: HTMLElement): SelectionRange | null;
export declare function setSelectionRange(root: HTMLElement, start: number, end: number): boolean;
