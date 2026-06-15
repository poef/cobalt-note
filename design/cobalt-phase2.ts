export interface Annotation {
    range: [number, number];
    tag: string;
    order: number;
}

export interface EffectiveState {
    strong: boolean;
    em: boolean;
    underline: boolean;
    link: string | null;
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

export function isTagActive(
    annotations: Annotation[],
    offset: number,
    tagName: "strong" | "em" | "underline" | "link"
): boolean {
    const state = getEffectiveState(annotations, offset);

    switch (tagName) {
        case "strong":
            return state.strong;

        case "em":
            return state.em;

        case "underline":
            return state.underline;

        case "link":
            return state.link !== null;
    }
}
