export interface NotebookPoint {
    noteIndex: number;
    offset: number;
}
export interface NotebookRange {
    start: NotebookPoint;
    end: NotebookPoint;
}
export interface NotebookSelection {
    anchor: NotebookPoint;
    focus: NotebookPoint;
}
export interface LocalSelectionRange {
    start: number;
    end: number;
}
export interface NotebookNoteAdapter {
    getLength(): number;
    focus(start: number, end?: number): void;
    getSelection(): LocalSelectionRange | null;
    getCaretClientRect(offset?: number): DOMRect | null;
    isCaretOnFirstVisualLine(): boolean;
    isCaretOnLastVisualLine(): boolean;
    focusNearestPoint(x: number, y: number): void;
    getOffsetAtPoint(x: number, y: number): number;
    getWordRangeAtPoint?(x: number, y: number): LocalSelectionRange;
    getParagraphRangeAtPoint?(x: number, y: number): LocalSelectionRange;
    getClientRect(): DOMRect;
    showSelectionRanges(ranges: LocalSelectionRange[], active?: boolean): void;
    clearSelectionRanges(): void;
}
export declare class NotebookController {
    private adapters;
    private selection;
    private selectionActive;
    private desiredVerticalX;
    setAdapters(adapters: NotebookNoteAdapter[]): void;
    getSelection(): NotebookSelection | null;
    hasSelection(): boolean;
    setSelectionActive(active: boolean): void;
    isSelectionActive(): boolean;
    selectRange(anchor: NotebookPoint, focus: NotebookPoint, active?: boolean): void;
    selectWordAtClientPosition(x: number, y: number): boolean;
    selectParagraphAtClientPosition(x: number, y: number): boolean;
    clearSelection(): void;
    startPointerSelection(point: NotebookPoint): void;
    updatePointerSelection(point: NotebookPoint): void;
    finishPointerSelection(): void;
    getPointAtClientPosition(x: number, y: number): NotebookPoint | null;
    resetVerticalNavigation(): void;
    prepareVerticalNavigation(index: number): void;
    getOrderedSelection(): NotebookRange | null;
    getSelectedRangeForNote(index: number): LocalSelectionRange | null;
    extendLeft(index: number, offset: number): NotebookPoint;
    extendRight(index: number, offset: number): NotebookPoint;
    extendUp(index: number, offset: number): boolean;
    extendDown(index: number, offset: number): boolean;
    moveLeft(index: number, offset: number): boolean;
    moveRight(index: number, offset: number): boolean;
    moveUp(index: number): boolean;
    moveDown(index: number): boolean;
    private selectExpandedRangeAtClientPosition;
    private getNoteIndexAtClientPosition;
    private ensureSelection;
    private applyFocusAndDecorations;
    private extendVertically;
    private movePointLeft;
    private movePointRight;
    private getDesiredVerticalX;
    private getNoteLength;
    private updateSelectionDecorations;
    private clearSelectionDecorations;
}
export declare function compareNotebookPoints(a: NotebookPoint, b: NotebookPoint): number;
export declare function orderNotebookSelection(selection: NotebookSelection): NotebookRange;
export declare function getSelectedRangeForNote(index: number, range: NotebookRange, getNoteLength: (index: number) => number): LocalSelectionRange | null;
