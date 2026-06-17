import { Annotation, Fragment } from "./fragment.js";
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
export declare function createEmptyState(): EffectiveState;
export declare function getEffectiveState(annotations: Annotation[], offset: number): EffectiveState;
export declare function getTypingEffectiveState(annotations: Annotation[], offset: number): EffectiveState;
export declare function generateRuns(fragment: Fragment): Run[];
export declare function stateEquals(a: EffectiveState, b: EffectiveState): boolean;
