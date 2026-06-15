import { parseAnnotationTag } from "./registry.js";
export function createEmptyState() {
    return {
        strong: false,
        em: false,
        underline: false,
        link: null
    };
}
export function getEffectiveState(annotations, offset) {
    const state = createEmptyState();
    const activeAnnotations = annotations
        .filter(annotation => offset >= annotation.range[0] &&
        offset < annotation.range[1])
        .sort((a, b) => a.order - b.order);
    for (const annotation of activeAnnotations) {
        applyAnnotationToState(state, annotation.tag);
    }
    return state;
}
export function generateRuns(fragment) {
    const boundaries = new Set();
    boundaries.add(0);
    boundaries.add(fragment.text.length);
    for (const annotation of fragment.annotations) {
        boundaries.add(annotation.range[0]);
        boundaries.add(annotation.range[1]);
    }
    const sortedBoundaries = Array
        .from(boundaries)
        .filter(boundary => boundary >= 0 &&
        boundary <= fragment.text.length)
        .sort((a, b) => a - b);
    const runs = [];
    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
        const start = sortedBoundaries[i];
        const end = sortedBoundaries[i + 1];
        if (start === end) {
            continue;
        }
        runs.push({
            start,
            end,
            state: getEffectiveState(fragment.annotations, start)
        });
    }
    return mergeAdjacentRuns(runs);
}
export function stateEquals(a, b) {
    return (a.strong === b.strong &&
        a.em === b.em &&
        a.underline === b.underline &&
        a.link === b.link);
}
function mergeAdjacentRuns(runs) {
    if (runs.length === 0) {
        return [];
    }
    const merged = [
        {
            start: runs[0].start,
            end: runs[0].end,
            state: { ...runs[0].state }
        }
    ];
    for (let i = 1; i < runs.length; i++) {
        const current = runs[i];
        const previous = merged[merged.length - 1];
        if (previous.end === current.start &&
            stateEquals(previous.state, current.state)) {
            previous.end = current.end;
        }
        else {
            merged.push({
                start: current.start,
                end: current.end,
                state: { ...current.state }
            });
        }
    }
    return merged;
}
function applyAnnotationToState(state, tag) {
    const parsed = parseAnnotationTag(tag);
    if (!parsed) {
        return;
    }
    switch (parsed.name) {
        case "strong":
            state.strong = parsed.enabled;
            break;
        case "em":
            state.em = parsed.enabled;
            break;
        case "underline":
            state.underline = parsed.enabled;
            break;
        case "link":
            state.link = parsed.enabled
                ? parsed.href ?? null
                : null;
            break;
    }
}
//# sourceMappingURL=runs.js.map