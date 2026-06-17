export class NotebookController {
    adapters = [];
    selection = null;
    selectionActive = true;
    desiredVerticalX = null;
    setAdapters(adapters) {
        this.adapters = adapters;
        this.updateSelectionDecorations();
    }
    getSelection() {
        return this.selection
            ? cloneSelection(this.selection)
            : null;
    }
    hasSelection() {
        return this.selection !== null &&
            compareNotebookPoints(this.selection.anchor, this.selection.focus) !== 0;
    }
    setSelectionActive(active) {
        if (this.selectionActive === active) {
            return;
        }
        this.selectionActive = active;
        this.updateSelectionDecorations();
    }
    isSelectionActive() {
        return this.selectionActive;
    }
    selectRange(anchor, focus, active = true) {
        this.resetVerticalNavigation();
        this.selectionActive = active;
        this.selection = {
            anchor: { ...anchor },
            focus: { ...focus }
        };
        this.adapters[focus.noteIndex]?.focus(focus.offset, focus.offset);
        this.updateSelectionDecorations();
    }
    selectWordAtClientPosition(x, y) {
        return this.selectExpandedRangeAtClientPosition(x, y, "word");
    }
    selectParagraphAtClientPosition(x, y) {
        return this.selectExpandedRangeAtClientPosition(x, y, "paragraph");
    }
    clearSelection() {
        if (!this.selection) {
            return;
        }
        this.selection = null;
        this.selectionActive = true;
        this.clearSelectionDecorations();
    }
    startPointerSelection(point) {
        this.resetVerticalNavigation();
        this.selectionActive = true;
        this.selection = {
            anchor: { ...point },
            focus: { ...point }
        };
        this.adapters[point.noteIndex]?.focus(point.offset, point.offset);
        this.updateSelectionDecorations();
    }
    updatePointerSelection(point) {
        if (!this.selection) {
            this.startPointerSelection(point);
            return;
        }
        this.selection.focus = { ...point };
        this.adapters[point.noteIndex]?.focus(point.offset, point.offset);
        this.updateSelectionDecorations();
    }
    finishPointerSelection() {
        if (!this.hasSelection()) {
            this.clearSelection();
        }
        else {
            this.updateSelectionDecorations();
        }
    }
    getPointAtClientPosition(x, y) {
        const index = this.getNoteIndexAtClientPosition(x, y);
        if (index === null) {
            return null;
        }
        return {
            noteIndex: index,
            offset: this.adapters[index].getOffsetAtPoint(x, y)
        };
    }
    resetVerticalNavigation() {
        this.desiredVerticalX = null;
    }
    prepareVerticalNavigation(index) {
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
    getOrderedSelection() {
        if (!this.selection) {
            return null;
        }
        return orderNotebookSelection(this.selection);
    }
    getSelectedRangeForNote(index) {
        const ordered = this.getOrderedSelection();
        if (!ordered) {
            return null;
        }
        return getSelectedRangeForNote(index, ordered, noteIndex => this.getNoteLength(noteIndex));
    }
    extendLeft(index, offset) {
        this.ensureSelection(index, offset);
        this.selection.focus = this.movePointLeft(this.selection.focus);
        return this.applyFocusAndDecorations();
    }
    extendRight(index, offset) {
        this.ensureSelection(index, offset);
        this.selection.focus = this.movePointRight(this.selection.focus);
        return this.applyFocusAndDecorations();
    }
    extendUp(index, offset) {
        this.ensureSelection(index, offset);
        return this.extendVertically("up");
    }
    extendDown(index, offset) {
        this.ensureSelection(index, offset);
        return this.extendVertically("down");
    }
    moveLeft(index, offset) {
        this.resetVerticalNavigation();
        if (offset !== 0 || index === 0) {
            return false;
        }
        const previousIndex = index - 1;
        this.adapters[previousIndex]?.focus(this.getNoteLength(previousIndex));
        return true;
    }
    moveRight(index, offset) {
        this.resetVerticalNavigation();
        if (offset !== this.getNoteLength(index) || index >= this.adapters.length - 1) {
            return false;
        }
        this.adapters[index + 1]?.focus(0);
        return true;
    }
    moveUp(index) {
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
            source.focusNearestPoint(x, getVerticalCenter(sourceRect) - getVerticalStep(sourceRect));
            return true;
        }
        if (index === 0) {
            return false;
        }
        const targetIndex = index - 1;
        const targetRect = this.adapters[targetIndex]?.getCaretClientRect(this.getNoteLength(targetIndex));
        if (!targetRect) {
            return false;
        }
        this.adapters[targetIndex]?.focusNearestPoint(x, getVerticalCenter(targetRect));
        return true;
    }
    joinWithPrevious(index) {
        this.resetVerticalNavigation();
        if (index <= 0 || index >= this.adapters.length) {
            return null;
        }
        const targetIndex = index - 1;
        const source = this.adapters[index];
        const target = this.adapters[targetIndex];
        if (!source || !target) {
            return null;
        }
        const sourceFragment = source.sliceFragment(0, source.getLength());
        if (!target.canMergeFragment(sourceFragment, "after")) {
            return null;
        }
        const result = target.mergeFragment(sourceFragment, "after");
        if (!result) {
            return null;
        }
        this.clearSelection();
        return {
            noteIndex: targetIndex,
            removeNoteIndex: index,
            fragment: result.fragment,
            focus: {
                noteIndex: targetIndex,
                offset: result.joinOffset
            }
        };
    }
    joinWithNext(index, focusOffset = this.getNoteLength(index)) {
        this.resetVerticalNavigation();
        if (index < 0 || index >= this.adapters.length - 1) {
            return null;
        }
        const target = this.adapters[index];
        const source = this.adapters[index + 1];
        if (!source || !target) {
            return null;
        }
        const sourceFragment = source.sliceFragment(0, source.getLength());
        if (!target.canMergeFragment(sourceFragment, "after")) {
            return null;
        }
        const result = target.mergeFragment(sourceFragment, "after");
        if (!result) {
            return null;
        }
        this.clearSelection();
        return {
            noteIndex: index,
            removeNoteIndex: index + 1,
            fragment: result.fragment,
            focus: {
                noteIndex: index,
                offset: focusOffset
            }
        };
    }
    deleteSelection() {
        this.resetVerticalNavigation();
        const ordered = this.getOrderedSelection();
        if (!ordered) {
            return null;
        }
        const { start, end } = ordered;
        if (compareNotebookPoints(start, end) === 0) {
            this.clearSelection();
            return null;
        }
        const target = this.adapters[start.noteIndex];
        if (!target) {
            return null;
        }
        if (start.noteIndex === end.noteIndex) {
            target.deleteRange(start.offset, end.offset);
            this.clearSelection();
            return {
                focus: { ...start }
            };
        }
        const source = this.adapters[end.noteIndex];
        if (!source) {
            return null;
        }
        const suffix = source.sliceFragment(end.offset, source.getLength());
        if (!target.canInsertFragment(suffix)) {
            return null;
        }
        target.deleteRange(start.offset, target.getLength());
        target.insertFragment(start.offset, suffix);
        const fragment = target.sliceFragment(0, target.getLength());
        this.clearSelection();
        return {
            focus: { ...start },
            replacement: {
                noteIndex: start.noteIndex,
                removeNoteIndex: end.noteIndex,
                fragment
            }
        };
    }
    moveDown(index) {
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
            source.focusNearestPoint(x, getVerticalCenter(sourceRect) + getVerticalStep(sourceRect));
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
        this.adapters[targetIndex]?.focusNearestPoint(x, getVerticalCenter(targetRect));
        return true;
    }
    selectExpandedRangeAtClientPosition(x, y, granularity) {
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
        this.selectRange({ noteIndex: index, offset: range.start }, { noteIndex: index, offset: range.end });
        return true;
    }
    getNoteIndexAtClientPosition(x, y) {
        if (this.adapters.length === 0) {
            return null;
        }
        let closest = null;
        for (let index = 0; index < this.adapters.length; index++) {
            const rect = this.adapters[index].getClientRect();
            if (y >= rect.top &&
                y <= rect.bottom &&
                x >= rect.left &&
                x <= rect.right) {
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
    ensureSelection(index, offset) {
        if (this.selection) {
            return;
        }
        this.selection = {
            anchor: { noteIndex: index, offset },
            focus: { noteIndex: index, offset }
        };
    }
    applyFocusAndDecorations() {
        const focus = this.selection.focus;
        this.adapters[focus.noteIndex]?.focus(focus.offset, focus.offset);
        this.updateSelectionDecorations();
        return { ...focus };
    }
    extendVertically(direction) {
        const focus = this.selection.focus;
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
            const targetRect = this.adapters[targetIndex]?.getCaretClientRect(this.getNoteLength(targetIndex));
            if (!targetRect) {
                return false;
            }
            this.adapters[targetIndex]?.focusNearestPoint(x, getVerticalCenter(targetRect));
            const targetSelection = this.adapters[targetIndex]?.getSelection();
            if (!targetSelection) {
                return false;
            }
            this.selection.focus = {
                noteIndex: targetIndex,
                offset: targetSelection.start
            };
        }
        else {
            if (focus.noteIndex >= this.adapters.length - 1 ||
                !sourceEditor.isCaretOnLastVisualLine()) {
                return false;
            }
            const targetIndex = focus.noteIndex + 1;
            const targetRect = this.adapters[targetIndex]?.getCaretClientRect(0);
            if (!targetRect) {
                return false;
            }
            this.adapters[targetIndex]?.focusNearestPoint(x, getVerticalCenter(targetRect));
            const targetSelection = this.adapters[targetIndex]?.getSelection();
            if (!targetSelection) {
                return false;
            }
            this.selection.focus = {
                noteIndex: targetIndex,
                offset: targetSelection.start
            };
        }
        this.updateSelectionDecorations();
        return true;
    }
    movePointLeft(point) {
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
    movePointRight(point) {
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
    getDesiredVerticalX(sourceRect) {
        if (this.desiredVerticalX === null) {
            this.desiredVerticalX = sourceRect.left;
        }
        return this.desiredVerticalX;
    }
    getNoteLength(index) {
        return this.adapters[index]?.getLength() ?? 0;
    }
    updateSelectionDecorations() {
        for (let index = 0; index < this.adapters.length; index++) {
            const range = this.getSelectedRangeForNote(index);
            if (range) {
                this.adapters[index].showSelectionRanges([range], this.selectionActive);
            }
            else {
                this.adapters[index].clearSelectionRanges();
            }
        }
    }
    clearSelectionDecorations() {
        for (const adapter of this.adapters) {
            adapter.clearSelectionRanges();
        }
    }
}
export function compareNotebookPoints(a, b) {
    if (a.noteIndex !== b.noteIndex) {
        return a.noteIndex - b.noteIndex;
    }
    return a.offset - b.offset;
}
export function orderNotebookSelection(selection) {
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
export function getSelectedRangeForNote(index, range, getNoteLength) {
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
function getVerticalCenter(rect) {
    return rect.top + rect.height / 2;
}
function getVerticalStep(rect) {
    return Math.max(rect.height, 16);
}
function cloneSelection(selection) {
    return {
        anchor: { ...selection.anchor },
        focus: { ...selection.focus }
    };
}
//# sourceMappingURL=notebook.js.map