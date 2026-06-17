export interface Annotation {
    range: [number, number];
    tag: string;
    order: number;
}

export interface Fragment {
    text: string;
    annotations: Annotation[];
}

export function getNextOrder(fragment: Fragment): number {
    if (fragment.annotations.length === 0) {
        return 1;
    }

    return Math.max(...fragment.annotations.map(annotation => annotation.order)) + 1;
}

export function addAnnotation(
    fragment: Fragment,
    range: [number, number],
    tag: string
): Annotation | null {
    const [start, end] = range;

    if (end <= start) {
        return null;
    }

    const annotation: Annotation = {
        range: [start, end],
        tag,
        order: getNextOrder(fragment)
    };

    fragment.annotations.push(annotation);

    return annotation;
}

export interface InsertTextOptions {
    growAtEnd?: boolean;
}

export function insertText(
    fragment: Fragment,
    offset: number,
    text: string,
    options: InsertTextOptions = {}
): void {
    if (text.length === 0) {
        return;
    }

    const normalizedOffset = clamp(offset, 0, fragment.text.length);
    const growAtEnd = options.growAtEnd ?? true;
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
        } else if (
            normalizedOffset < end ||
            (growAtEnd && normalizedOffset === end)
        ) {
            end += delta;
        }

        annotation.range = [start, end];
    }
}

export function deleteRange(
    fragment: Fragment,
    startOffset: number,
    endOffset: number
): void {
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
                ] as [number, number]
            };
        })
        .filter(annotation => annotation.range[1] > annotation.range[0]);
}

function transformDeletedOffset(
    offset: number,
    deleteStart: number,
    deleteEnd: number
): number {
    if (offset <= deleteStart) {
        return offset;
    }

    if (offset >= deleteEnd) {
        return offset - (deleteEnd - deleteStart);
    }

    return deleteStart;
}

function clamp(
    value: number,
    min: number,
    max: number
): number {
    return Math.max(min, Math.min(max, value));
}
