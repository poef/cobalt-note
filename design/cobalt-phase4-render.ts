export interface Annotation {
    range: [number, number];
    tag: string;
    order: number;
}

export interface Fragment {
    text: string;
    annotations: Annotation[];
}

export interface EffectiveState {
    strong: boolean;
    em: boolean;
    underline: boolean;
    link: string | null;
}

export interface Run {
    start: number;
    end: number;
    state: EffectiveState;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function parseTag(tag: string): {
    name: string;
    enabled: boolean;
    href?: string;
} | null {
    const trimmed = tag.trim();

    if (trimmed === "<strong>") {
        return { name: "strong", enabled: true };
    }

    if (trimmed === "</strong>") {
        return { name: "strong", enabled: false };
    }

    if (trimmed === "<em>") {
        return { name: "em", enabled: true };
    }

    if (trimmed === "</em>") {
        return { name: "em", enabled: false };
    }

    if (trimmed === "<u>") {
        return { name: "underline", enabled: true };
    }

    if (trimmed === "</u>") {
        return { name: "underline", enabled: false };
    }

    const linkMatch = trimmed.match(/^<a\s+href="([^"]+)">$/);

    if (linkMatch) {
        return {
            name: "link",
            enabled: true,
            href: linkMatch[1]
        };
    }

    if (trimmed === "</a>") {
        return {
            name: "link",
            enabled: false
        };
    }

    return null;
}

export function getEffectiveState(
    annotations: Annotation[],
    offset: number
): EffectiveState {
    const state: EffectiveState = {
        strong: false,
        em: false,
        underline: false,
        link: null
    };

    const activeAnnotations = annotations
        .filter(annotation =>
            offset >= annotation.range[0] &&
            offset < annotation.range[1]
        )
        .sort((a, b) => a.order - b.order);

    for (const annotation of activeAnnotations) {
        const parsed = parseTag(annotation.tag);

        if (!parsed) {
            continue;
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

    return state;
}

function stateEquals(
    a: EffectiveState,
    b: EffectiveState
): boolean {
    return (
        a.strong === b.strong &&
        a.em === b.em &&
        a.underline === b.underline &&
        a.link === b.link
    );
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
            state: getEffectiveState(
                fragment.annotations,
                start
            )
        });
    }

    return mergeAdjacentRuns(runs);
}

function mergeAdjacentRuns(
    runs: Run[]
): Run[] {
    if (runs.length === 0) {
        return [];
    }

    const merged: Run[] = [
        { ...runs[0] }
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
            merged.push({ ...current });
        }
    }

    return merged;
}

function renderRun(
    text: string,
    state: EffectiveState
): string {
    let html = escapeHtml(text);

    html = html.replace(/\n/g, "<br>\n");

    if (state.strong) {
        html = `<strong>${html}</strong>`;
    }

    if (state.em) {
        html = `<em>${html}</em>`;
    }

    if (state.underline) {
        html = `<u>${html}</u>`;
    }

    if (state.link) {
        html = `<a href="${state.link}">${html}</a>`;
    }

    return html;
}

export function render(
    fragment: Fragment
): string {
    const runs = generateRuns(fragment);

    let html = "";

    for (const run of runs) {
        const text = fragment.text.slice(
            run.start,
            run.end
        );

        html += renderRun(text, run.state);
    }

    return html;
}
