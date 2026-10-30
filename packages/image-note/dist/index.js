import { edit, RICH_TEXT_NOTE_FRAGMENT_TYPE } from "@cobalt/rich-text-note";
export const IMAGE_NOTE_FRAGMENT_TYPE = "image";
export function editImageNote(element, value, options = {}) {
    if (!isImageNoteValue(value)) {
        throw new Error("Expected an image note value.");
    }
    const captionFragment = normalizeCaption(value.caption);
    value.caption = captionFragment;
    element.className = options.className ?? "cobalt-image-note";
    element.tabIndex = 0;
    element.setAttribute("role", "figure");
    const image = document.createElement("img");
    image.className = "cobalt-image-note__image";
    const captionElement = document.createElement("figcaption");
    captionElement.className = "cobalt-image-note__caption";
    captionElement.setAttribute("aria-label", "Image caption");
    element.textContent = "";
    element.append(image, captionElement);
    const captionEditor = edit(captionElement, captionFragment);
    let selection = { start: 0, end: 0 };
    let imageSelected = false;
    function syncStaticDom() {
        image.src = value.src;
        image.alt = value.alt ?? "";
        element.setAttribute("aria-label", value.alt || getCaptionText() || "Image note");
    }
    function getCaptionText() {
        return captionFragment.text;
    }
    function getLength() {
        return 1 + captionEditor.getLength();
    }
    function clampOffset(offset) {
        return Math.max(0, Math.min(getLength(), offset));
    }
    function isCaptionOffset(offset) {
        return offset > 1 || (offset === 1 && document.activeElement === captionElement);
    }
    function setImageSelection(start, end = start) {
        selection = {
            start: clampOffset(start),
            end: clampOffset(end)
        };
    }
    function focusImageOffset(offset) {
        element.focus();
        setImageSelection(offset, offset);
    }
    function getImageRect() {
        const rect = image.getBoundingClientRect();
        if (rect.width || rect.height) {
            return rect;
        }
        return element.getBoundingClientRect();
    }
    function getCaptionRect() {
        const rect = captionElement.getBoundingClientRect();
        if (rect.width || rect.height) {
            return rect;
        }
        const imageRect = getImageRect();
        return new DOMRect(imageRect.left, imageRect.bottom, imageRect.width, 1);
    }
    function updateImageSelectionClass(active = true) {
        element.toggleAttribute("data-cobalt-image-selected", imageSelected);
        if (imageSelected) {
            element.toggleAttribute("data-cobalt-selection-active", active);
        }
        else {
            element.removeAttribute("data-cobalt-selection-active");
        }
    }
    function getCaptionRange(range) {
        const start = Math.max(1, range.start);
        const end = Math.min(getLength(), range.end);
        if (end <= start) {
            return null;
        }
        return {
            start: start - 1,
            end: end - 1
        };
    }
    const editor = {
        element,
        getType() {
            return IMAGE_NOTE_FRAGMENT_TYPE;
        },
        getValue() {
            return cloneImageNoteValue({
                src: value.src,
                alt: value.alt,
                caption: captionFragment
            });
        },
        setValue(nextValue) {
            if (!isImageNoteValue(nextValue)) {
                throw new Error("Expected an image note value.");
            }
            value.src = nextValue.src;
            value.alt = nextValue.alt;
            const nextCaption = normalizeCaption(nextValue.caption);
            replaceCaptionFragment(captionFragment, nextCaption);
            value.caption = captionFragment;
            captionEditor.setValue(captionFragment);
            syncStaticDom();
        },
        getLength,
        getText(start = 0, end = getLength()) {
            const normalizedStart = clampOffset(start);
            const normalizedEnd = clampOffset(end);
            const parts = [];
            if (normalizedStart < 1 && normalizedEnd > 0) {
                parts.push(value.alt ?? "");
            }
            if (normalizedEnd > 1) {
                parts.push(captionEditor.getText(Math.max(0, normalizedStart - 1), normalizedEnd - 1));
            }
            return parts.filter(Boolean).join("\n");
        },
        focus(start = 0, end = start) {
            const normalizedStart = clampOffset(start);
            const normalizedEnd = clampOffset(end);
            if (normalizedStart > 1 || normalizedEnd > 1) {
                captionEditor.focus(Math.max(0, normalizedStart - 1), Math.max(0, normalizedEnd - 1));
                selection = { start: normalizedStart, end: normalizedEnd };
                return;
            }
            focusImageOffset(normalizedEnd);
        },
        getSelection() {
            if (document.activeElement === captionElement || captionElement.contains(document.activeElement)) {
                const captionSelection = captionEditor.getSelection();
                if (captionSelection) {
                    return {
                        start: captionSelection.start + 1,
                        end: captionSelection.end + 1
                    };
                }
            }
            return { ...selection };
        },
        getCaretClientRect(offset) {
            const requestedOffset = offset ?? editor.getSelection()?.end ?? 0;
            const normalizedOffset = clampOffset(requestedOffset);
            if (normalizedOffset > 1 || isCaptionOffset(normalizedOffset)) {
                return captionEditor.getCaretClientRect(Math.max(0, normalizedOffset - 1));
            }
            const rect = getImageRect();
            const x = normalizedOffset === 0 ? rect.left : rect.right;
            return new DOMRect(x, rect.top, 1, rect.height || 1);
        },
        isCaretOnFirstVisualLine() {
            const current = this.getSelection();
            return !current || current.start <= 1;
        },
        isCaretOnLastVisualLine() {
            const current = this.getSelection();
            if (!current || current.start <= 1) {
                return false;
            }
            return captionEditor.isCaretOnLastVisualLine();
        },
        focusNearestPoint(x, y) {
            const captionRect = getCaptionRect();
            if (y >= captionRect.top) {
                captionEditor.focusNearestPoint(x, y);
                const captionSelection = captionEditor.getSelection();
                if (captionSelection) {
                    selection = {
                        start: captionSelection.start + 1,
                        end: captionSelection.end + 1
                    };
                }
                return;
            }
            const imageRect = getImageRect();
            this.focus(x < imageRect.left + imageRect.width / 2 ? 0 : 1);
        },
        getOffsetAtPoint(x, y) {
            const captionRect = getCaptionRect();
            if (y >= captionRect.top) {
                return captionEditor.getOffsetAtPoint(x, y) + 1;
            }
            const rect = getImageRect();
            return x < rect.left + rect.width / 2 ? 0 : 1;
        },
        getClientRect() {
            return element.getBoundingClientRect();
        },
        showSelectionRanges(ranges, active = true) {
            imageSelected = ranges.some(range => range.start <= 0 && range.end >= 1);
            const captionRanges = ranges
                .map(getCaptionRange)
                .filter((range) => range !== null);
            if (captionRanges.length > 0) {
                captionEditor.showSelectionRanges(captionRanges, active);
            }
            else {
                captionEditor.clearSelectionRanges();
            }
            updateImageSelectionClass(active);
        },
        clearSelectionRanges() {
            imageSelected = false;
            captionEditor.clearSelectionRanges();
            updateImageSelectionClass();
        },
        deleteRange(start, end) {
            const captionRange = getCaptionRange({ start, end });
            if (captionRange) {
                captionEditor.deleteRange(captionRange.start, captionRange.end);
                syncStaticDom();
            }
        },
        insertText(offset, text) {
            if (offset >= 1) {
                captionEditor.insertText(offset - 1, text);
                syncStaticDom();
            }
        },
        sliceFragment(start, end) {
            const normalizedStart = clampOffset(start);
            const normalizedEnd = clampOffset(end);
            if (normalizedStart >= 1) {
                return captionEditor.sliceFragment(normalizedStart - 1, normalizedEnd - 1);
            }
            const captionRange = getCaptionRange({ start: normalizedStart, end: normalizedEnd });
            const caption = captionRange
                ? captionEditor.sliceFragment(captionRange.start, captionRange.end).data
                : { text: "", annotations: [] };
            return wrapImageNoteValue({
                src: value.src,
                alt: value.alt,
                caption
            });
        },
        canInsertFragment(fragment) {
            return fragment.type === RICH_TEXT_NOTE_FRAGMENT_TYPE;
        },
        insertFragment(offset, fragment) {
            if (fragment.type !== RICH_TEXT_NOTE_FRAGMENT_TYPE || offset < 1) {
                return clampOffset(offset);
            }
            const nextOffset = captionEditor.insertFragment(offset - 1, fragment) + 1;
            syncStaticDom();
            return nextOffset;
        },
        canSplit() {
            return false;
        },
        splitFragment() {
            const fragment = wrapImageNoteValue({
                src: value.src,
                alt: value.alt,
                caption: captionFragment
            });
            return { before: fragment, after: fragment };
        },
        canMergeFragment() {
            return false;
        },
        mergeFragment() {
            return null;
        },
        canApplyCommand(command, range, nextValue) {
            if (command === "set-alt") {
                return range.start <= 0 && range.end >= 1;
            }
            if (command === "set-caption") {
                return typeof nextValue === "string";
            }
            if (range.start >= 1 && captionEditor.canApplyCommand) {
                return captionEditor.canApplyCommand(command, {
                    start: range.start - 1,
                    end: range.end - 1
                }, nextValue);
            }
            return false;
        },
        getCommandState(command, offset) {
            if (command === "set-alt") {
                return value.alt;
            }
            if (command === "set-caption") {
                return captionFragment.text;
            }
            if (offset >= 1) {
                return captionEditor.getCommandState(command, offset - 1);
            }
            return undefined;
        },
        applyCommand(command, range, nextValue) {
            if (command === "set-alt") {
                value.alt = typeof nextValue === "string" ? nextValue : "";
                syncStaticDom();
                return true;
            }
            if (command === "set-caption") {
                replaceCaptionFragment(captionFragment, {
                    text: typeof nextValue === "string" ? nextValue : "",
                    annotations: []
                });
                captionEditor.setValue(captionFragment);
                syncStaticDom();
                return true;
            }
            if (range.start >= 1) {
                const applied = captionEditor.applyCommand(command, {
                    start: range.start - 1,
                    end: range.end - 1
                }, nextValue);
                syncStaticDom();
                return applied;
            }
            return false;
        },
        destroy() {
            element.removeEventListener("keydown", handleKeyDown);
            captionEditor.destroy();
            element.textContent = "";
            element.classList.remove("cobalt-image-note");
            element.removeAttribute("data-cobalt-image-selected");
            element.removeAttribute("data-cobalt-selection-active");
        }
    };
    function handleKeyDown(event) {
        // Ancestors may consume a shortcut for a notebook-wide operation.
        if (event.defaultPrevented || event.target !== element || event.isComposing ||
            event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
            return;
        }
        const current = editor.getSelection();
        if (!current || current.start !== current.end) {
            return;
        }
        let direction;
        if (event.key === "Backspace" && current.start === 1) {
            direction = "previous";
        }
        else if (event.key === "Delete" && current.start === 0) {
            direction = "next";
        }
        if (direction) {
            event.preventDefault();
            event.stopPropagation();
            // The host owns the note list and can accept or ignore this request.
            element.dispatchEvent(new CustomEvent("cobalt:request-remove-note", {
                bubbles: true,
                detail: { direction }
            }));
            return;
        }
        if (event.key === "ArrowLeft" && current.start > 0) {
            event.preventDefault();
            editor.focus(current.start - 1);
        }
        if (event.key === "ArrowRight" && current.start < 1) {
            event.preventDefault();
            editor.focus(current.start + 1);
        }
        if (event.key === "ArrowRight" && current.start === 1 && captionEditor.getLength() > 0) {
            event.preventDefault();
            editor.focus(1);
            captionEditor.focus(0);
        }
    }
    element.addEventListener("keydown", handleKeyDown);
    syncStaticDom();
    return editor;
}
export function isImageNoteValue(value) {
    return !!value &&
        typeof value === "object" &&
        typeof value.src === "string" &&
        (value.alt === undefined || typeof value.alt === "string") &&
        (value.caption === undefined ||
            typeof value.caption === "string" ||
            isFragment(value.caption));
}
export function isImageNoteFragment(fragment) {
    return fragment.type === IMAGE_NOTE_FRAGMENT_TYPE && isNormalizedImageNoteValue(fragment.data);
}
export function wrapImageNoteValue(value) {
    return {
        type: IMAGE_NOTE_FRAGMENT_TYPE,
        data: cloneImageNoteValue({
            src: value.src,
            alt: value.alt,
            caption: normalizeCaption(value.caption)
        })
    };
}
function isNormalizedImageNoteValue(value) {
    return !!value &&
        typeof value === "object" &&
        typeof value.src === "string" &&
        (value.alt === undefined || typeof value.alt === "string") &&
        isFragment(value.caption);
}
function isFragment(value) {
    return !!value &&
        typeof value === "object" &&
        typeof value.text === "string" &&
        Array.isArray(value.annotations);
}
function normalizeCaption(caption) {
    if (typeof caption === "string") {
        return { text: caption, annotations: [] };
    }
    if (isFragment(caption)) {
        return cloneFragment(caption);
    }
    return { text: "", annotations: [] };
}
function cloneImageNoteValue(value) {
    return {
        src: value.src,
        alt: value.alt,
        caption: cloneFragment(value.caption)
    };
}
function cloneFragment(fragment) {
    return {
        text: fragment.text,
        annotations: fragment.annotations.map(annotation => ({
            ...annotation,
            range: [...annotation.range]
        }))
    };
}
function replaceCaptionFragment(target, source) {
    target.text = source.text;
    target.annotations = source.annotations.map(annotation => ({
        ...annotation,
        range: [...annotation.range]
    }));
}
//# sourceMappingURL=index.js.map