import type {
    LocalSelectionRange,
    NotebookNoteAdapter,
    NotebookNoteFragment,
    NotebookNoteMergeResult
} from "@cobalt/notebook";

export const CODE_NOTE_FRAGMENT_TYPE = "text/code";

export interface CodeNoteValue {
    text: string;
}

export interface CodeNoteFragment {
    type: typeof CODE_NOTE_FRAGMENT_TYPE;
    data: CodeNoteValue;
}

export interface CodeNoteEditor extends NotebookNoteAdapter {
    element: HTMLTextAreaElement;
    destroy(): void;
}

export interface CodeNoteOptions {
    className?: string;
}

export function editCodeNote(
    element: HTMLTextAreaElement,
    value: CodeNoteValue,
    options: CodeNoteOptions = {}
): CodeNoteEditor {
    if (!isCodeNoteValue(value)) {
        throw new Error("Expected a code note value.");
    }

    element.className = options.className ?? "cobalt-code-note";
    element.value = value.text;
    element.spellcheck = false;
    element.wrap = "off";
    element.setAttribute("aria-label", "Code note");

    let selectionDecorationRanges: LocalSelectionRange[] = [];

    function syncFromTextarea(): void {
        value.text = element.value;
        autoGrow(element);
    }

    function syncToTextarea(start?: number, end = start): void {
        element.value = value.text;
        autoGrow(element);

        if (start !== undefined) {
            setTextareaSelection(element, start, end ?? start);
        }
    }

    function getLineCount(): number {
        return value.text.split("\n").length;
    }

    function getSelectionStartLine(): number {
        return value.text.slice(0, element.selectionStart).split("\n").length - 1;
    }

    const editor: CodeNoteEditor = {
        element,
        getType(): typeof CODE_NOTE_FRAGMENT_TYPE {
            return CODE_NOTE_FRAGMENT_TYPE;
        },
        getValue(): CodeNoteValue {
            return cloneCodeNoteValue(value);
        },
        setValue(nextValue: unknown): void {
            if (!isCodeNoteValue(nextValue)) {
                throw new Error("Expected a code note value.");
            }

            value.text = nextValue.text;
            syncToTextarea();
        },
        getLength(): number {
            return value.text.length;
        },
        getText(start = 0, end = value.text.length): string {
            return value.text.slice(
                clamp(start, 0, value.text.length),
                clamp(end, 0, value.text.length)
            );
        },
        focus(start = 0, end = start): void {
            element.focus();
            setTextareaSelection(element, start, end);
        },
        getSelection(): LocalSelectionRange | null {
            return {
                start: element.selectionStart,
                end: element.selectionEnd
            };
        },
        getCaretClientRect(_offset?: number): DOMRect | null {
            return getTextareaApproximateCaretRect(element);
        },
        isCaretOnFirstVisualLine(): boolean {
            return getSelectionStartLine() === 0;
        },
        isCaretOnLastVisualLine(): boolean {
            return getSelectionStartLine() >= getLineCount() - 1;
        },
        focusNearestPoint(_x: number, y: number): void {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const lineHeight = parseLineHeight(style);
            const line = clamp(Math.floor((y - rect.top + element.scrollTop) / lineHeight), 0, getLineCount() - 1);
            const offset = getLineStartOffset(value.text, line);

            this.focus(offset, offset);
        },
        getOffsetAtPoint(_x: number, y: number): number {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const lineHeight = parseLineHeight(style);
            const line = clamp(Math.floor((y - rect.top + element.scrollTop) / lineHeight), 0, getLineCount() - 1);

            return getLineStartOffset(value.text, line);
        },
        getWordRangeAtPoint(x: number, y: number): LocalSelectionRange {
            const offset = this.getOffsetAtPoint(x, y);
            return getWordRange(value.text, offset);
        },
        getParagraphRangeAtPoint(x: number, y: number): LocalSelectionRange {
            const offset = this.getOffsetAtPoint(x, y);
            return getLineRange(value.text, offset);
        },
        getClientRect(): DOMRect {
            return element.getBoundingClientRect();
        },
        showSelectionRanges(ranges: LocalSelectionRange[]): void {
            selectionDecorationRanges = ranges.filter(range => range.end > range.start);
            const first = selectionDecorationRanges[0];

            if (first && document.activeElement === element) {
                setTextareaSelection(element, first.start, first.end);
            }
        },
        clearSelectionRanges(): void {
            selectionDecorationRanges = [];
        },
        deleteRange(start: number, end: number): void {
            const normalizedStart = clamp(start, 0, value.text.length);
            const normalizedEnd = clamp(end, 0, value.text.length);

            if (normalizedEnd <= normalizedStart) {
                return;
            }

            value.text = value.text.slice(0, normalizedStart) + value.text.slice(normalizedEnd);
            syncToTextarea(normalizedStart, normalizedStart);
        },
        insertText(offset: number, text: string): void {
            const normalizedOffset = clamp(offset, 0, value.text.length);
            value.text = value.text.slice(0, normalizedOffset) + text + value.text.slice(normalizedOffset);
            const caret = normalizedOffset + text.length;
            syncToTextarea(caret, caret);
        },
        sliceFragment(start: number, end: number): CodeNoteFragment {
            return wrapCodeNoteValue({
                text: this.getText(start, end)
            });
        },
        canInsertFragment(fragment: NotebookNoteFragment): boolean {
            return isCodeNoteFragment(fragment);
        },
        insertFragment(offset: number, fragment: NotebookNoteFragment): number {
            if (!isCodeNoteFragment(fragment)) {
                return offset;
            }

            const normalizedOffset = clamp(offset, 0, value.text.length);
            value.text = value.text.slice(0, normalizedOffset) + fragment.data.text + value.text.slice(normalizedOffset);
            const caret = normalizedOffset + fragment.data.text.length;
            syncToTextarea(caret, caret);
            return caret;
        },
        splitFragment(offset: number): { before: CodeNoteFragment; after: CodeNoteFragment } {
            const normalizedOffset = clamp(offset, 0, value.text.length);

            return {
                before: wrapCodeNoteValue({ text: value.text.slice(0, normalizedOffset) }),
                after: wrapCodeNoteValue({ text: value.text.slice(normalizedOffset) })
            };
        },
        canMergeFragment(fragment: NotebookNoteFragment, _direction: "before" | "after"): boolean {
            return isCodeNoteFragment(fragment);
        },
        mergeFragment(fragment: NotebookNoteFragment, direction: "before" | "after"): NotebookNoteMergeResult | null {
            if (!isCodeNoteFragment(fragment)) {
                return null;
            }

            const first = direction === "after" ? value : fragment.data;
            const second = direction === "after" ? fragment.data : value;
            const separator = needsJoinSeparator(first.text, second.text) ? "\n" : "";
            const text = first.text + separator + second.text;
            const joinOffset = separator.length > 0
                ? first.text.length + separator.length
                : first.text.endsWith("\n")
                    ? first.text.length
                    : second.text.startsWith("\n")
                        ? first.text.length + 1
                        : first.text.length;

            return {
                fragment: wrapCodeNoteValue({ text }),
                joinOffset
            };
        },
        canApplyCommand(): boolean {
            return false;
        },
        getCommandState(): unknown {
            return undefined;
        },
        applyCommand(): boolean {
            return false;
        },
        destroy(): void {
            element.removeEventListener("input", syncFromTextarea);
            element.classList.remove("cobalt-code-note");
        }
    };

    element.addEventListener("input", syncFromTextarea);
    syncToTextarea();

    return editor;
}

export function autoGrow(textarea: HTMLTextAreaElement): void {
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

export function isCodeNoteValue(value: unknown): value is CodeNoteValue {
    return !!value &&
        typeof value === "object" &&
        typeof (value as Partial<CodeNoteValue>).text === "string";
}

export function isCodeNoteFragment(fragment: NotebookNoteFragment): fragment is CodeNoteFragment {
    return fragment.type === CODE_NOTE_FRAGMENT_TYPE && isCodeNoteValue(fragment.data);
}

export function wrapCodeNoteValue(value: CodeNoteValue): CodeNoteFragment {
    return {
        type: CODE_NOTE_FRAGMENT_TYPE,
        data: cloneCodeNoteValue(value)
    };
}

function cloneCodeNoteValue(value: CodeNoteValue): CodeNoteValue {
    return { text: value.text };
}

function setTextareaSelection(textarea: HTMLTextAreaElement, start: number, end: number): void {
    const length = textarea.value.length;
    textarea.setSelectionRange(
        clamp(start, 0, length),
        clamp(end, 0, length)
    );
}

function getTextareaApproximateCaretRect(textarea: HTMLTextAreaElement): DOMRect | null {
    const rect = textarea.getBoundingClientRect();
    const style = getComputedStyle(textarea);
    const lineHeight = parseLineHeight(style);
    const offset = textarea.selectionStart;
    const line = textarea.value.slice(0, offset).split("\n").length - 1;

    return new DOMRect(
        rect.left,
        rect.top + line * lineHeight - textarea.scrollTop,
        1,
        lineHeight
    );
}

function parseLineHeight(style: CSSStyleDeclaration): number {
    const parsed = Number.parseFloat(style.lineHeight);

    if (Number.isFinite(parsed)) {
        return parsed;
    }

    const fontSize = Number.parseFloat(style.fontSize);
    return Number.isFinite(fontSize) ? fontSize * 1.4 : 16;
}

function getLineStartOffset(text: string, lineIndex: number): number {
    if (lineIndex <= 0) {
        return 0;
    }

    let offset = 0;

    for (let i = 0; i < lineIndex; i++) {
        const next = text.indexOf("\n", offset);

        if (next === -1) {
            return text.length;
        }

        offset = next + 1;
    }

    return offset;
}

function getLineRange(text: string, offset: number): LocalSelectionRange {
    const start = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
    const nextNewline = text.indexOf("\n", offset);
    const end = nextNewline === -1 ? text.length : nextNewline;

    return { start, end };
}

function getWordRange(text: string, offset: number): LocalSelectionRange {
    let start = clamp(offset, 0, text.length);
    let end = start;

    while (start > 0 && /[A-Za-z0-9_$]/.test(text[start - 1])) {
        start--;
    }

    while (end < text.length && /[A-Za-z0-9_$]/.test(text[end])) {
        end++;
    }

    return { start, end };
}

function needsJoinSeparator(first: string, second: string): boolean {
    return first.length > 0 &&
        second.length > 0 &&
        !first.endsWith("\n") &&
        !second.startsWith("\n");
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
