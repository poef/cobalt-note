import { Annotation, Fragment } from "./fragment.js";
import { parseAnnotationTag } from "./registry.js";

export interface ActiveAnnotation {
    name: string;
    tag: string;
    priority: number;
}

export type EffectiveState = Record<string, ActiveAnnotation>;

export interface Run {
    start: number;
    end: number;
    state: EffectiveState;
}

export function createEmptyState(): EffectiveState {
    return {};
}

export function getEffectiveState(
    annotations: Annotation[],
    offset: number
): EffectiveState {
    const state = createEmptyState();

    const activeAnnotations = annotations
        .filter(annotation =>
            offset >= annotation.range[0] &&
            offset < annotation.range[1]
        )
        .sort((a, b) => a.order - b.order);

    for (const annotation of activeAnnotations) {
        applyAnnotationToState(state, annotation.tag);
    }

    return state;
}

export function generateRuns(fragment: Fragment): Run[] {
    const boundaries = new Set<number>();

    boundaries.add(0);
    boundaries.add(fragment.text.length);

    for (const annotation of fragment.annotations) {
        boundaries.add(annotation.range[0]);
        boundaries.add(annotation.range[1]);
    }

    const sortedBoundaries = Array
        .from(boundaries)
        .filter(boundary =>
            boundary >= 0 &&
            boundary <= fragment.text.length
        )
        .sort((a, b) => a - b);

    const runs: Run[] = [];

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

export function stateEquals(
    a: EffectiveState,
    b: EffectiveState
): boolean {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();

    if (aKeys.length !== bKeys.length) {
        return false;
    }

    for (let i = 0; i < aKeys.length; i++) {
        const key = aKeys[i];

        if (key !== bKeys[i]) {
            return false;
        }

        if (
            a[key].tag !== b[key].tag ||
            a[key].priority !== b[key].priority
        ) {
            return false;
        }
    }

    return true;
}

function mergeAdjacentRuns(
    runs: Run[]
): Run[] {
    if (runs.length === 0) {
        return [];
    }

    const merged: Run[] = [
        {
            start: runs[0].start,
            end: runs[0].end,
            state: copyState(runs[0].state)
        }
    ];

    for (let i = 1; i < runs.length; i++) {
        const current = runs[i];
        const previous = merged[merged.length - 1];

        if (
            previous.end === current.start &&
            stateEquals(previous.state, current.state)
        ) {
            previous.end = current.end;
        } else {
            merged.push({
                start: current.start,
                end: current.end,
                state: copyState(current.state)
            });
        }
    }

    return merged;
}

function copyState(state: EffectiveState): EffectiveState {
    return Object.fromEntries(
        Object.entries(state).map(([key, value]) => [
            key,
            { ...value }
        ])
    );
}

function applyAnnotationToState(
    state: EffectiveState,
    tag: string
): void {
    const parsed = parseAnnotationTag(tag);

    if (!parsed) {
        return;
    }

    if (!parsed.enabled) {
        delete state[parsed.name];
        return;
    }

    if (!parsed.tag) {
        return;
    }

    state[parsed.name] = {
        name: parsed.name,
        tag: parsed.tag,
        priority: parsed.priority
    };
}
