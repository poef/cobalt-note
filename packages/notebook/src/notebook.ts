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

export interface NotebookNoteFragment {
    /**
     * Opaque content type owned by the note implementation.
     * Notebook may compare this value, but must not inspect data.
     */
    type: string;
    data: unknown;
}

export interface NotebookNoteMergeResult {
    fragment: NotebookNoteFragment;
    joinOffset: number;
}

export interface NotebookNoteAdapter {
    getType(): string;
    getValue(): unknown;
    setValue(value: unknown): void;
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

    deleteRange(start: number, end: number): void;
    insertText(offset: number, text: string): void;
    sliceFragment(start: number, end: number): NotebookNoteFragment;
    canInsertFragment(fragment: NotebookNoteFragment): boolean;
    insertFragment(offset: number, fragment: NotebookNoteFragment): number;
    splitFragment(offset: number): {
        before: NotebookNoteFragment;
        after: NotebookNoteFragment;
    };
    canMergeFragment(fragment: NotebookNoteFragment, direction: "before" | "after"): boolean;
    mergeFragment(fragment: NotebookNoteFragment, direction: "before" | "after"): NotebookNoteMergeResult | null;
    canApplyAnnotation?(name: string): boolean;
    applyAnnotation?(start: number, end: number, name: string, value?: unknown): void;
}

export class NotebookController {
    private adapters: NotebookNoteAdapter[] = [];
    private selection: NotebookSelection | null = null;
    private selectionActive = true;
    private desiredVerticalX: number | null = null;

    setAdapters(adapters: NotebookNoteAdapter[]): void {
        this.adapters = adapters;
        this.updateSelectionDecorations();
    }

    getSelection(): NotebookSelection | null {
        return this.selection
            ? cloneSelection(this.selection)
            : null;
    }

    hasSelection(): boolean {
        return this.selection !== null &&
            compareNotebookPoints(this.selection.anchor, this.selection.focus) !== 0;
    }

    setSelectionActive(active: boolean): void {
        if (this.selectionActive === active) {
            return;
        }

        this.selectionActive = active;
        this.updateSelectionDecorations();
    }

    isSelectionActive(): boolean {
        return this.selectionActive;
    }

    selectRange(anchor: NotebookPoint, focus: NotebookPoint, active = true): void {
        this.resetVerticalNavigation();
        this.selectionActive = active;
        this.selection = {
            anchor: { ...anchor },
            focus: { ...focus }
        };
        this.adapters[focus.noteIndex]?.focus(focus.offset, focus.offset);
        this.updateSelectionDecorations();
    }

    selectWordAtClientPosition(x: number, y: number): boolean {
        return this.selectExpandedRangeAtClientPosition(x, y, "word");
    }

    selectParagraphAtClientPosition(x: number, y: number): boolean {
        return this.selectExpandedRangeAtClientPosition(x, y, "paragraph");
    }

    clearSelection(): void {
        if (!this.selection) {
            return;
        }

        this.selection = null;
        this.selectionActive = true;
        this.clearSelectionDecorations();
    }


    startPointerSelection(point: NotebookPoint): void {
        this.resetVerticalNavigation();
        this.selectionActive = true;
        this.selection = {
            anchor: { ...point },
            focus: { ...point }
        };
        this.adapters[point.noteIndex]?.focus(point.offset, point.offset);
        this.updateSelectionDecorations();
    }

    updatePointerSelection(point: NotebookPoint): void {
        if (!this.selection) {
            this.startPointerSelection(point);
            return;
        }

        this.selection.focus = { ...point };
        this.adapters[point.noteIndex]?.focus(point.offset, point.offset);
        this.updateSelectionDecorations();
    }

    finishPointerSelection(): void {
        if (!this.hasSelection()) {
            this.clearSelection();
        } else {
            this.updateSelectionDecorations();
        }
    }

    getPointAtClientPosition(x: number, y: number): NotebookPoint | null {
        const index = this.getNoteIndexAtClientPosition(x, y);

        if (index === null) {
            return null;
        }

        return {
            noteIndex: index,
            offset: this.adapters[index].getOffsetAtPoint(x, y)
        };
    }

    resetVerticalNavigation(): void {
        this.desiredVerticalX = null;
    }

    prepareVerticalNavigation(index: number): void {
        if (this.desiredVerticalX !== null) {
            return;
        }

        const adapter = this.adapters[index];
        const selection = adapter?.getSelection();

        if (!adapter || !selection || selection.start !== selection.end) {
            return;
        }

        const rect = adapter.getCaretClientRect(selection.start);

        if (rect) {
            this.desiredVerticalX = rect.left;
        }
    }

    getOrderedSelection(): NotebookRange | null {
        if (!this.selection) {
            return null;
        }

        return orderNotebookSelection(this.selection);
    }

    getSelectedRangeForNote(index: number): LocalSelectionRange | null {
        const ordered = this.getOrderedSelection();

        if (!ordered) {
            return null;
        }

        return getSelectedRangeForNote(
            index,
            ordered,
            noteIndex => this.getNoteLength(noteIndex)
        );
    }

    extendLeft(index: number, offset: number): NotebookPoint {
        this.ensureSelection(index, offset);
        this.selection!.focus = this.movePointLeft(this.selection!.focus);
        return this.applyFocusAndDecorations();
    }

    extendRight(index: number, offset: number): NotebookPoint {
        this.ensureSelection(index, offset);
        this.selection!.focus = this.movePointRight(this.selection!.focus);
        return this.applyFocusAndDecorations();
    }

    extendUp(index: number, offset: number): boolean {
        this.ensureSelection(index, offset);
        return this.extendVertically("up");
    }

    extendDown(index: number, offset: number): boolean {
        this.ensureSelection(index, offset);
        return this.extendVertically("down");
    }

    moveLeft(index: number, offset: number): boolean {
        this.resetVerticalNavigation();

        if (offset !== 0 || index === 0) {
            return false;
        }

        const previousIndex = index - 1;
        this.adapters[previousIndex]?.focus(this.getNoteLength(previousIndex));
        return true;
    }

    moveRight(index: number, offset: number): boolean {
        this.resetVerticalNavigation();

        if (offset !== this.getNoteLength(index) || index >= this.adapters.length - 1) {
            return false;
        }

        this.adapters[index + 1]?.focus(0);
        return true;
    }

    moveUp(index: number): boolean {
        const source = this.adapters[index];

        if (!source) {
            return false;
        }

        const sourceRect = source.getCaretClientRect();

        if (!sourceRect) {
            return false;
        }

        const x = this.getDesiredVerticalX(sourceRect);

        if (!source.isCaretOnFirstVisualLine()) {
            source.focusNearestPoint(
                x,
                getVerticalCenter(sourceRect) - getVerticalStep(sourceRect)
            );
            return true;
        }

        if (index === 0) {
            return false;
        }

        const targetIndex = index - 1;
        const targetRect = this.adapters[targetIndex]?.getCaretClientRect(
            this.getNoteLength(targetIndex)
        );

        if (!targetRect) {
            return false;
        }

        this.adapters[targetIndex]?.focusNearestPoint(
            x,
            getVerticalCenter(targetRect)
        );

        return true;
    }

    moveDown(index: number): boolean {
        const source = this.adapters[index];

        if (!source) {
            return false;
        }

        const sourceRect = source.getCaretClientRect();

        if (!sourceRect) {
            return false;
        }

        const x = this.getDesiredVerticalX(sourceRect);

        if (!source.isCaretOnLastVisualLine()) {
            source.focusNearestPoint(
                x,
                getVerticalCenter(sourceRect) + getVerticalStep(sourceRect)
            );
            return true;
        }

        if (index >= this.adapters.length - 1) {
            return false;
        }

        const targetIndex = index + 1;
        const targetRect = this.adapters[targetIndex]?.getCaretClientRect(0);

        if (!targetRect) {
            return false;
        }

        this.adapters[targetIndex]?.focusNearestPoint(
            x,
            getVerticalCenter(targetRect)
        );

        return true;
    }



    private selectExpandedRangeAtClientPosition(
        x: number,
        y: number,
        granularity: "word" | "paragraph"
    ): boolean {
        const index = this.getNoteIndexAtClientPosition(x, y);

        if (index === null) {
            return false;
        }

        const adapter = this.adapters[index];
        const range = granularity === "word"
            ? adapter.getWordRangeAtPoint?.(x, y)
            : adapter.getParagraphRangeAtPoint?.(x, y);

        if (!range || range.end <= range.start) {
            return false;
        }

        this.selectRange(
            { noteIndex: index, offset: range.start },
            { noteIndex: index, offset: range.end }
        );

        return true;
    }

    private getNoteIndexAtClientPosition(x: number, y: number): number | null {
        if (this.adapters.length === 0) {
            return null;
        }

        let closest: {
            index: number;
            distance: number;
        } | null = null;

        for (let index = 0; index < this.adapters.length; index++) {
            const rect = this.adapters[index].getClientRect();

            if (
                y >= rect.top &&
                y <= rect.bottom &&
                x >= rect.left &&
                x <= rect.right
            ) {
                return index;
            }

            const verticalDistance = y < rect.top
                ? rect.top - y
                : y > rect.bottom
                    ? y - rect.bottom
                    : 0;

            const horizontalDistance = x < rect.left
                ? rect.left - x
                : x > rect.right
                    ? x - rect.right
                    : 0;

            const distance = verticalDistance * 10000 + horizontalDistance;

            if (!closest || distance < closest.distance) {
                closest = { index, distance };
            }
        }

        return closest?.index ?? null;
    }

    private ensureSelection(index: number, offset: number): void {
        if (this.selection) {
            return;
        }

        this.selection = {
            anchor: { noteIndex: index, offset },
            focus: { noteIndex: index, offset }
        };
    }

    private applyFocusAndDecorations(): NotebookPoint {
        const focus = this.selection!.focus;
        this.adapters[focus.noteIndex]?.focus(focus.offset, focus.offset);
        this.updateSelectionDecorations();
        return { ...focus };
    }

    private extendVertically(direction: "up" | "down"): boolean {
        const focus = this.selection!.focus;
        const sourceEditor = this.adapters[focus.noteIndex];

        if (!sourceEditor) {
            return false;
        }

        sourceEditor.focus(focus.offset, focus.offset);

        const sourceRect = sourceEditor.getCaretClientRect();

        if (!sourceRect) {
            return false;
        }

        const x = this.getDesiredVerticalX(sourceRect);

        if (direction === "up") {
            if (focus.noteIndex === 0 || !sourceEditor.isCaretOnFirstVisualLine()) {
                return false;
            }

            const targetIndex = focus.noteIndex - 1;
            const targetRect = this.adapters[targetIndex]?.getCaretClientRect(
                this.getNoteLength(targetIndex)
            );

            if (!targetRect) {
                return false;
            }

            this.adapters[targetIndex]?.focusNearestPoint(
                x,
                getVerticalCenter(targetRect)
            );

            const targetSelection = this.adapters[targetIndex]?.getSelection();

            if (!targetSelection) {
                return false;
            }

            this.selection!.focus = {
                noteIndex: targetIndex,
                offset: targetSelection.start
            };
        } else {
            if (
                focus.noteIndex >= this.adapters.length - 1 ||
                !sourceEditor.isCaretOnLastVisualLine()
            ) {
                return false;
            }

            const targetIndex = focus.noteIndex + 1;
            const targetRect = this.adapters[targetIndex]?.getCaretClientRect(0);

            if (!targetRect) {
                return false;
            }

            this.adapters[targetIndex]?.focusNearestPoint(
                x,
                getVerticalCenter(targetRect)
            );

            const targetSelection = this.adapters[targetIndex]?.getSelection();

            if (!targetSelection) {
                return false;
            }

            this.selection!.focus = {
                noteIndex: targetIndex,
                offset: targetSelection.start
            };
        }

        this.updateSelectionDecorations();
        return true;
    }

    private movePointLeft(point: NotebookPoint): NotebookPoint {
        if (point.offset > 0) {
            return {
                noteIndex: point.noteIndex,
                offset: point.offset - 1
            };
        }

        if (point.noteIndex === 0) {
            return point;
        }

        const previousIndex = point.noteIndex - 1;

        return {
            noteIndex: previousIndex,
            offset: this.getNoteLength(previousIndex)
        };
    }

    private movePointRight(point: NotebookPoint): NotebookPoint {
        const noteLength = this.getNoteLength(point.noteIndex);

        if (point.offset < noteLength) {
            return {
                noteIndex: point.noteIndex,
                offset: point.offset + 1
            };
        }

        if (point.noteIndex >= this.adapters.length - 1) {
            return point;
        }

        return {
            noteIndex: point.noteIndex + 1,
            offset: 0
        };
    }

    private getDesiredVerticalX(sourceRect: DOMRect): number {
        if (this.desiredVerticalX === null) {
            this.desiredVerticalX = sourceRect.left;
        }

        return this.desiredVerticalX;
    }

    private getNoteLength(index: number): number {
        return this.adapters[index]?.getLength() ?? 0;
    }

    private updateSelectionDecorations(): void {
        for (let index = 0; index < this.adapters.length; index++) {
            const range = this.getSelectedRangeForNote(index);

            if (range) {
                this.adapters[index].showSelectionRanges([range], this.selectionActive);
            } else {
                this.adapters[index].clearSelectionRanges();
            }
        }
    }

    private clearSelectionDecorations(): void {
        for (const adapter of this.adapters) {
            adapter.clearSelectionRanges();
        }
    }
}

export function compareNotebookPoints(
    a: NotebookPoint,
    b: NotebookPoint
): number {
    if (a.noteIndex !== b.noteIndex) {
        return a.noteIndex - b.noteIndex;
    }

    return a.offset - b.offset;
}

export function orderNotebookSelection(
    selection: NotebookSelection
): NotebookRange {
    if (compareNotebookPoints(selection.anchor, selection.focus) <= 0) {
        return {
            start: { ...selection.anchor },
            end: { ...selection.focus }
        };
    }

    return {
        start: { ...selection.focus },
        end: { ...selection.anchor }
    };
}

export function getSelectedRangeForNote(
    index: number,
    range: NotebookRange,
    getNoteLength: (index: number) => number
): LocalSelectionRange | null {
    if (index < range.start.noteIndex || index > range.end.noteIndex) {
        return null;
    }

    const start = index === range.start.noteIndex
        ? range.start.offset
        : 0;

    const end = index === range.end.noteIndex
        ? range.end.offset
        : getNoteLength(index);

    return end > start
        ? { start, end }
        : null;
}

function getVerticalCenter(rect: DOMRect): number {
    return rect.top + rect.height / 2;
}

function getVerticalStep(rect: DOMRect): number {
    return Math.max(rect.height, 16);
}

function cloneSelection(selection: NotebookSelection): NotebookSelection {
    return {
        anchor: { ...selection.anchor },
        focus: { ...selection.focus }
    };
}
