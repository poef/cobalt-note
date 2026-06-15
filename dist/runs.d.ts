import { Annotation, Fragment } from "./fragment.js";
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
export declare function createEmptyState(): EffectiveState;
export declare function getEffectiveState(annotations: Annotation[], offset: number): EffectiveState;
export declare function generateRuns(fragment: Fragment): Run[];
export declare function stateEquals(a: EffectiveState, b: EffectiveState): boolean;
