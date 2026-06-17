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
        return getLineIndexAtOffset(value.text, element.selectionStart);
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
        getCaretClientRect(offset?: number): DOMRect | null {
            return getTextareaCaretRect(element, offset);
        },
        isCaretOnFirstVisualLine(): boolean {
            return getSelectionStartLine() === 0;
        },
        isCaretOnLastVisualLine(): boolean {
            return getSelectionStartLine() >= getLineCount() - 1;
        },
        focusNearestPoint(x: number, y: number): void {
            const offset = getTextareaOffsetAtPoint(element, x, y);

            this.focus(offset, offset);
        },
        getOffsetAtPoint(x: number, y: number): number {
            return getTextareaOffsetAtPoint(element, x, y);
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

            // Native textarea selection cannot be painted independently from the
            // browser selection, so code-note can only show the local part of a
            // notebook selection when the textarea itself is focused. Cross-note
            // selection still works logically through notebook offsets.
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

function getTextareaCaretRect(textarea: HTMLTextAreaElement, offset = textarea.selectionStart): DOMRect | null {
    const metrics = getTextareaMetrics(textarea);
    const normalizedOffset = clamp(offset, 0, textarea.value.length);
    const line = getLineIndexAtOffset(textarea.value, normalizedOffset);
    const lineStart = getLineStartOffset(textarea.value, line);
    const column = normalizedOffset - lineStart;

    return new DOMRect(
        metrics.contentLeft + column * metrics.characterWidth - textarea.scrollLeft,
        metrics.contentTop + line * metrics.lineHeight - textarea.scrollTop,
        1,
        metrics.lineHeight
    );
}

function getTextareaOffsetAtPoint(textarea: HTMLTextAreaElement, x: number, y: number): number {
    const metrics = getTextareaMetrics(textarea);
    const lineCount = textarea.value.split("\n").length;
    const line = clamp(
        Math.floor((y - metrics.contentTop + textarea.scrollTop) / metrics.lineHeight),
        0,
        lineCount - 1
    );
    const lineStart = getLineStartOffset(textarea.value, line);
    const lineEnd = getLineEndOffset(textarea.value, lineStart);
    const column = clamp(
        Math.round((x - metrics.contentLeft + textarea.scrollLeft) / metrics.characterWidth),
        0,
        lineEnd - lineStart
    );

    return lineStart + column;
}

interface TextareaMetrics {
    contentLeft: number;
    contentTop: number;
    lineHeight: number;
    characterWidth: number;
}

function getTextareaMetrics(textarea: HTMLTextAreaElement): TextareaMetrics {
    const rect = textarea.getBoundingClientRect();
    const style = getComputedStyle(textarea);
    const lineHeight = parseLineHeight(style);
    const fontSize = parseCssPixels(style.fontSize, 16);
    const characterWidth = measureMonospaceCharacterWidth(style, fontSize);

    return {
        contentLeft: rect.left + parseCssPixels(style.borderLeftWidth) + parseCssPixels(style.paddingLeft),
        contentTop: rect.top + parseCssPixels(style.borderTopWidth) + parseCssPixels(style.paddingTop),
        lineHeight,
        characterWidth
    };
}

function measureMonospaceCharacterWidth(style: CSSStyleDeclaration, fontSize: number): number {
    const sample = document.createElement("span");
    sample.textContent = "mmmmmmmmmm";
    sample.style.position = "absolute";
    sample.style.visibility = "hidden";
    sample.style.whiteSpace = "pre";
    sample.style.font = [
        style.fontStyle,
        style.fontVariant,
        style.fontWeight,
        style.fontSize,
        style.fontFamily
    ].filter(Boolean).join(" ");

    document.body.append(sample);
    const width = sample.getBoundingClientRect().width / 10;
    sample.remove();

    if (Number.isFinite(width) && width > 0) {
        return width;
    }

    return fontSize * 0.6;
}

function parseLineHeight(style: CSSStyleDeclaration): number {
    const parsed = Number.parseFloat(style.lineHeight);

    if (Number.isFinite(parsed)) {
        return parsed;
    }

    const fontSize = parseCssPixels(style.fontSize, 16);
    return fontSize * 1.4;
}

function parseCssPixels(value: string, fallback = 0): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getLineIndexAtOffset(text: string, offset: number): number {
    return text.slice(0, clamp(offset, 0, text.length)).split("\n").length - 1;
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

function getLineEndOffset(text: string, lineStart: number): number {
    const nextNewline = text.indexOf("\n", lineStart);
    return nextNewline === -1 ? text.length : nextNewline;
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
