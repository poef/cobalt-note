export interface Annotation {
    range: [number, number];
    tag: string;
    order: number;
}

export interface Fragment {
    text: string;
    annotations: Annotation[];
}

export function insertText(fragment: Fragment, offset: number, text: string): void {}
export function deleteRange(fragment: Fragment, start: number, end: number): void {}
export function addAnnotation(fragment: Fragment, range: [number, number], tag: string): void {}
