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

    return Math.max(...fragment.annotations.map(a => a.order)) + 1;
}

export function addAnnotation(
    fragment: Fragment,
    range: [number, number],
    tag: string
): Annotation {
    const annotation: Annotation = {
        range: [...range] as [number, number],
        tag,
        order: getNextOrder(fragment)
    };

    fragment.annotations.push(annotation);

    return annotation;
}

export function insertText(
    fragment: Fragment,
    offset: number,
    text: string
): void {
    const delta = text.length;

    fragment.text =
        fragment.text.slice(0, offset) +
        text +
        fragment.text.slice(offset);

    for (const annotation of fragment.annotations) {
        let [start, end] = annotation.range;

        if (offset < start) {
            start += delta;
            end += delta;
        } else if (offset < end) {
            end += delta;
        } else if (offset === end) {
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
    if (endOffset <= startOffset) {
        return;
    }

    const delta = endOffset - startOffset;

    fragment.text =
        fragment.text.slice(0, startOffset) +
        fragment.text.slice(endOffset);

    for (const annotation of fragment.annotations) {
        let [start, end] = annotation.range;

        if (endOffset <= start) {
            start -= delta;
            end -= delta;
        } else if (startOffset >= end) {
            continue;
        } else {
            start = Math.min(start, startOffset);
            end = Math.max(start, end - delta);
        }

        annotation.range = [start, end];
    }

    fragment.annotations = fragment.annotations.filter(
        a => a.range[1] > a.range[0]
    );
}
