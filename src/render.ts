import { Fragment } from "./fragment.js";
import { createHtmlCloseTag } from "./registry.js";
import { ActiveAnnotation, EffectiveState, generateRuns } from "./runs.js";

interface RenderTag {
    key: string;
    open: string;
    close: string;
}

export function render(fragment: Fragment): string {
    const runs = generateRuns(fragment);

    let html = "";
    let openTags: RenderTag[] = [];

    for (const run of runs) {
        const nextTags = getRenderTags(run.state);
        const sharedPrefixLength = getSharedPrefixLength(openTags, nextTags);

        for (let i = openTags.length - 1; i >= sharedPrefixLength; i--) {
            html += openTags[i].close;
        }

        for (let i = sharedPrefixLength; i < nextTags.length; i++) {
            html += nextTags[i].open;
        }

        html += escapeHtml(fragment.text.slice(run.start, run.end));
        openTags = nextTags;
    }

    for (let i = openTags.length - 1; i >= 0; i--) {
        html += openTags[i].close;
    }

    return html;
}

function getRenderTags(state: EffectiveState): RenderTag[] {
    return Object
        .values(state)
        .sort(compareActiveAnnotations)
        .map(annotation => ({
            key: `${annotation.name}:${annotation.tag}`,
            open: annotation.tag,
            close: createHtmlCloseTag(annotation.tag)
        }));
}

function compareActiveAnnotations(
    a: ActiveAnnotation,
    b: ActiveAnnotation
): number {
    if (a.priority !== b.priority) {
        return a.priority - b.priority;
    }

    return a.name.localeCompare(b.name);
}

function getSharedPrefixLength(
    current: RenderTag[],
    next: RenderTag[]
): number {
    const length = Math.min(current.length, next.length);

    for (let i = 0; i < length; i++) {
        if (current[i].key !== next[i].key) {
            return i;
        }
    }

    return length;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
