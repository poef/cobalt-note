export const CODE_NOTE_FRAGMENT_TYPE = "text/code";
export function editCodeNote(element, value, options = {}) {
    if (!isCodeNoteValue(value)) {
        throw new Error("Expected a code note value.");
    }
    element.className = options.className ?? "cobalt-code-note";
    element.value = value.text;
    element.spellcheck = false;
    element.wrap = "off";
    element.setAttribute("aria-label", "Code note");
    let selectionDecorationRanges = [];
    function syncFromTextarea() {
        value.text = element.value;
        autoGrow(element);
    }
    function syncToTextarea(start, end = start) {
        element.value = value.text;
        autoGrow(element);
        if (start !== undefined) {
            setTextareaSelection(element, start, end ?? start);
        }
    }
    function getLineCount() {
        return value.text.split("\n").length;
    }
    function getSelectionStartLine() {
        return value.text.slice(0, element.selectionStart).split("\n").length - 1;
    }
    const editor = {
        element,
        getType() {
            return CODE_NOTE_FRAGMENT_TYPE;
        },
        getValue() {
            return cloneCodeNoteValue(value);
        },
        setValue(nextValue) {
            if (!isCodeNoteValue(nextValue)) {
                throw new Error("Expected a code note value.");
            }
            value.text = nextValue.text;
            syncToTextarea();
        },
        getLength() {
            return value.text.length;
        },
        getText(start = 0, end = value.text.length) {
            return value.text.slice(clamp(start, 0, value.text.length), clamp(end, 0, value.text.length));
        },
        focus(start = 0, end = start) {
            element.focus();
            setTextareaSelection(element, start, end);
        },
        getSelection() {
            return {
                start: element.selectionStart,
                end: element.selectionEnd
            };
        },
        getCaretClientRect(_offset) {
            return getTextareaApproximateCaretRect(element);
        },
        isCaretOnFirstVisualLine() {
            return getSelectionStartLine() === 0;
        },
        isCaretOnLastVisualLine() {
            return getSelectionStartLine() >= getLineCount() - 1;
        },
        focusNearestPoint(_x, y) {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const lineHeight = parseLineHeight(style);
            const line = clamp(Math.floor((y - rect.top + element.scrollTop) / lineHeight), 0, getLineCount() - 1);
            const offset = getLineStartOffset(value.text, line);
            this.focus(offset, offset);
        },
        getOffsetAtPoint(_x, y) {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const lineHeight = parseLineHeight(style);
            const line = clamp(Math.floor((y - rect.top + element.scrollTop) / lineHeight), 0, getLineCount() - 1);
            return getLineStartOffset(value.text, line);
        },
        getWordRangeAtPoint(x, y) {
            const offset = this.getOffsetAtPoint(x, y);
            return getWordRange(value.text, offset);
        },
        getParagraphRangeAtPoint(x, y) {
            const offset = this.getOffsetAtPoint(x, y);
            return getLineRange(value.text, offset);
        },
        getClientRect() {
            return element.getBoundingClientRect();
        },
        showSelectionRanges(ranges) {
            selectionDecorationRanges = ranges.filter(range => range.end > range.start);
            const first = selectionDecorationRanges[0];
            if (first && document.activeElement === element) {
                setTextareaSelection(element, first.start, first.end);
            }
        },
        clearSelectionRanges() {
            selectionDecorationRanges = [];
        },
        deleteRange(start, end) {
            const normalizedStart = clamp(start, 0, value.text.length);
            const normalizedEnd = clamp(end, 0, value.text.length);
            if (normalizedEnd <= normalizedStart) {
                return;
            }
            value.text = value.text.slice(0, normalizedStart) + value.text.slice(normalizedEnd);
            syncToTextarea(normalizedStart, normalizedStart);
        },
        insertText(offset, text) {
            const normalizedOffset = clamp(offset, 0, value.text.length);
            value.text = value.text.slice(0, normalizedOffset) + text + value.text.slice(normalizedOffset);
            const caret = normalizedOffset + text.length;
            syncToTextarea(caret, caret);
        },
        sliceFragment(start, end) {
            return wrapCodeNoteValue({
                text: this.getText(start, end)
            });
        },
        canInsertFragment(fragment) {
            return isCodeNoteFragment(fragment);
        },
        insertFragment(offset, fragment) {
            if (!isCodeNoteFragment(fragment)) {
                return offset;
            }
            const normalizedOffset = clamp(offset, 0, value.text.length);
            value.text = value.text.slice(0, normalizedOffset) + fragment.data.text + value.text.slice(normalizedOffset);
            const caret = normalizedOffset + fragment.data.text.length;
            syncToTextarea(caret, caret);
            return caret;
        },
        splitFragment(offset) {
            const normalizedOffset = clamp(offset, 0, value.text.length);
            return {
                before: wrapCodeNoteValue({ text: value.text.slice(0, normalizedOffset) }),
                after: wrapCodeNoteValue({ text: value.text.slice(normalizedOffset) })
            };
        },
        canMergeFragment(fragment, _direction) {
            return isCodeNoteFragment(fragment);
        },
        mergeFragment(fragment, direction) {
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
        canApplyCommand() {
            return false;
        },
        getCommandState() {
            return undefined;
        },
        applyCommand() {
            return false;
        },
        destroy() {
            element.removeEventListener("input", syncFromTextarea);
            element.classList.remove("cobalt-code-note");
        }
    };
    element.addEventListener("input", syncFromTextarea);
    syncToTextarea();
    return editor;
}
export function autoGrow(textarea) {
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
export function isCodeNoteValue(value) {
    return !!value &&
        typeof value === "object" &&
        typeof value.text === "string";
}
export function isCodeNoteFragment(fragment) {
    return fragment.type === CODE_NOTE_FRAGMENT_TYPE && isCodeNoteValue(fragment.data);
}
export function wrapCodeNoteValue(value) {
    return {
        type: CODE_NOTE_FRAGMENT_TYPE,
        data: cloneCodeNoteValue(value)
    };
}
function cloneCodeNoteValue(value) {
    return { text: value.text };
}
function setTextareaSelection(textarea, start, end) {
    const length = textarea.value.length;
    textarea.setSelectionRange(clamp(start, 0, length), clamp(end, 0, length));
}
function getTextareaApproximateCaretRect(textarea) {
    const rect = textarea.getBoundingClientRect();
    const style = getComputedStyle(textarea);
    const lineHeight = parseLineHeight(style);
    const offset = textarea.selectionStart;
    const line = textarea.value.slice(0, offset).split("\n").length - 1;
    return new DOMRect(rect.left, rect.top + line * lineHeight - textarea.scrollTop, 1, lineHeight);
}
function parseLineHeight(style) {
    const parsed = Number.parseFloat(style.lineHeight);
    if (Number.isFinite(parsed)) {
        return parsed;
    }
    const fontSize = Number.parseFloat(style.fontSize);
    return Number.isFinite(fontSize) ? fontSize * 1.4 : 16;
}
function getLineStartOffset(text, lineIndex) {
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
function getLineRange(text, offset) {
    const start = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
    const nextNewline = text.indexOf("\n", offset);
    const end = nextNewline === -1 ? text.length : nextNewline;
    return { start, end };
}
function getWordRange(text, offset) {
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
function needsJoinSeparator(first, second) {
    return first.length > 0 &&
        second.length > 0 &&
        !first.endsWith("\n") &&
        !second.startsWith("\n");
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
//# sourceMappingURL=index.js.map