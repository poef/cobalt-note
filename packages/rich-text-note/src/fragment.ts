export interface Annotation {
    range: [number, number];
    tag: string;
    order: number;
}

export interface Fragment {
    text: string;
    annotations: Annotation[];
}

export interface SplitFragmentResult {
    before: Fragment;
    after: Fragment;
}

export interface JoinFragmentsResult {
    fragment: Fragment;
    joinOffset: number;
}

export interface ConcatFragmentsResult {
    fragment: Fragment;
    joinOffset: number;
}

function getJoinOffsetAfterSeparator(
    first: Fragment,
    second: Fragment,
    separator: string
): number {
    if (separator.length > 0) {
        return first.text.length + separator.length;
    }

    if (first.text.endsWith("\n")) {
        return first.text.length;
    }

    if (second.text.startsWith("\n")) {
        return first.text.length + 1;
    }

    return first.text.length;
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

    fragment.annotations = mergeAdjacentMatchingAnnotations(
        fragment.annotations
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
            .filter(annotation => annotation.range[1] > annotation.range[0])
    );
}

export function sliceFragment(
    fragment: Fragment,
    startOffset: number,
    endOffset: number
): Fragment {
    const start = clamp(startOffset, 0, fragment.text.length);
    const end = clamp(endOffset, 0, fragment.text.length);

    if (end <= start) {
        return {
            text: "",
            annotations: []
        };
    }

    return {
        text: fragment.text.slice(start, end),
        annotations: fragment.annotations
            .map(annotation => {
                const annotationStart = Math.max(annotation.range[0], start);
                const annotationEnd = Math.min(annotation.range[1], end);

                if (annotationEnd <= annotationStart) {
                    return null;
                }

                return {
                    ...annotation,
                    range: [
                        annotationStart - start,
                        annotationEnd - start
                    ] as [number, number]
                };
            })
            .filter((annotation): annotation is Annotation => annotation !== null)
    };
}

export function insertFragment(
    fragment: Fragment,
    offset: number,
    inserted: Fragment,
    options: InsertTextOptions = {}
): void {
    const normalizedOffset = clamp(offset, 0, fragment.text.length);

    if (inserted.text.length === 0) {
        return;
    }

    const maxOrder = getNextOrder(fragment) - 1;

    insertText(fragment, normalizedOffset, inserted.text, options);

    const sortedAnnotations = [...inserted.annotations].sort((a, b) => {
        if (a.order !== b.order) {
            return a.order - b.order;
        }

        if (a.range[0] !== b.range[0]) {
            return a.range[0] - b.range[0];
        }

        return a.range[1] - b.range[1];
    });

    for (let i = 0; i < sortedAnnotations.length; i++) {
        const annotation = sortedAnnotations[i];

        fragment.annotations.push({
            ...annotation,
            range: [
                annotation.range[0] + normalizedOffset,
                annotation.range[1] + normalizedOffset
            ],
            order: maxOrder + i + 1
        });
    }

    fragment.annotations = mergeAdjacentMatchingAnnotations(fragment.annotations);
}

export function splitFragment(
    fragment: Fragment,
    offset: number
): SplitFragmentResult {
    const splitOffset = clamp(offset, 0, fragment.text.length);

    const before: Fragment = {
        text: fragment.text.slice(0, splitOffset),
        annotations: []
    };

    const after: Fragment = {
        text: fragment.text.slice(splitOffset),
        annotations: []
    };

    for (const annotation of fragment.annotations) {
        const [start, end] = annotation.range;

        const beforeStart = start;
        const beforeEnd = Math.min(end, splitOffset);

        if (beforeEnd > beforeStart) {
            before.annotations.push({
                ...annotation,
                range: [beforeStart, beforeEnd]
            });
        }

        const afterStart = Math.max(start, splitOffset) - splitOffset;
        const afterEnd = end - splitOffset;

        if (afterEnd > afterStart) {
            after.annotations.push({
                ...annotation,
                range: [afterStart, afterEnd]
            });
        }
    }

    return { before, after };
}

export function concatFragments(
    first: Fragment,
    second: Fragment,
    separator = ""
): ConcatFragmentsResult {
    const joinOffset = getJoinOffsetAfterSeparator(
        first,
        second,
        separator
    );
    const secondOffset = first.text.length + separator.length;

    return {
        fragment: {
            text: first.text + separator + second.text,
            annotations: mergeAdjacentMatchingAnnotations([
                ...first.annotations.map(annotation => ({
                    ...annotation,
                    range: [...annotation.range] as [number, number]
                })),
                ...second.annotations.map(annotation => ({
                    ...annotation,
                    range: [
                        annotation.range[0] + secondOffset,
                        annotation.range[1] + secondOffset
                    ] as [number, number]
                }))
            ])
        },
        joinOffset
    };
}

export function joinFragments(
    first: Fragment,
    second: Fragment
): JoinFragmentsResult {
    return concatFragments(
        first,
        second,
        needsJoinSeparator(first, second) ? "\n" : ""
    );
}

export function mergeAdjacentMatchingAnnotations(
    annotations: Annotation[]
): Annotation[] {
    const sorted = [...annotations].sort((a, b) => {
        if (a.order !== b.order) {
            return a.order - b.order;
        }

        if (a.tag !== b.tag) {
            return a.tag.localeCompare(b.tag);
        }

        if (a.range[0] !== b.range[0]) {
            return a.range[0] - b.range[0];
        }

        return a.range[1] - b.range[1];
    });

    const merged: Annotation[] = [];

    for (const annotation of sorted) {
        const previous = merged[merged.length - 1];

        if (
            previous &&
            previous.order === annotation.order &&
            previous.tag === annotation.tag &&
            previous.range[1] === annotation.range[0]
        ) {
            previous.range = [
                previous.range[0],
                annotation.range[1]
            ];
        } else {
            merged.push({
                ...annotation,
                range: [...annotation.range] as [number, number]
            });
        }
    }

    return merged;
}

function needsJoinSeparator(
    first: Fragment,
    second: Fragment
): boolean {
    if (first.text.length === 0 || second.text.length === 0) {
        return false;
    }

    return (
        !first.text.endsWith("\n") &&
        !second.text.startsWith("\n")
    );
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
