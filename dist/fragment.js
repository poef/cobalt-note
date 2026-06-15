export function getNextOrder(fragment) {
    if (fragment.annotations.length === 0) {
        return 1;
    }
    return Math.max(...fragment.annotations.map(annotation => annotation.order)) + 1;
}
export function addAnnotation(fragment, range, tag) {
    const [start, end] = range;
    if (end <= start) {
        return null;
    }
    const annotation = {
        range: [start, end],
        tag,
        order: getNextOrder(fragment)
    };
    fragment.annotations.push(annotation);
    return annotation;
}
export function insertText(fragment, offset, text) {
    if (text.length === 0) {
        return;
    }
    const normalizedOffset = clamp(offset, 0, fragment.text.length);
    const delta = text.length;
    fragment.text =
        fragment.text.slice(0, normalizedOffset) +
            text +
            fragment.text.slice(normalizedOffset);
    for (const annotation of fragment.annotations) {
        let [start, end] = annotation.range;
        if (normalizedOffset <= start) {
            start += delta;
            end += delta;
        }
        else if (normalizedOffset <= end) {
            end += delta;
        }
        annotation.range = [start, end];
    }
}
export function deleteRange(fragment, startOffset, endOffset) {
    const start = clamp(startOffset, 0, fragment.text.length);
    const end = clamp(endOffset, 0, fragment.text.length);
    if (end <= start) {
        return;
    }
    fragment.text =
        fragment.text.slice(0, start) +
            fragment.text.slice(end);
    fragment.annotations = fragment.annotations
        .map(annotation => {
        const [annotationStart, annotationEnd] = annotation.range;
        return {
            ...annotation,
            range: [
                transformDeletedOffset(annotationStart, start, end),
                transformDeletedOffset(annotationEnd, start, end)
            ]
        };
    })
        .filter(annotation => annotation.range[1] > annotation.range[0]);
}
function transformDeletedOffset(offset, deleteStart, deleteEnd) {
    if (offset <= deleteStart) {
        return offset;
    }
    if (offset >= deleteEnd) {
        return offset - (deleteEnd - deleteStart);
    }
    return deleteStart;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
//# sourceMappingURL=fragment.js.map