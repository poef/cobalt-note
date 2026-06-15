import { Fragment } from "../src/fragment.js";
import { render } from "../src/render.js";
import { generateRuns, getEffectiveState } from "../src/runs.js";

describe("annotation evaluation and rendering", () => {
    test("inverse annotation disables an earlier annotation for its range", () => {
        const fragment: Fragment = {
            text: "abcdefghij",
            annotations: [
                { range: [0, 10], tag: "<strong>", order: 1 },
                { range: [3, 7], tag: "</strong>", order: 2 }
            ]
        };

        expect(getEffectiveState(fragment.annotations, 2).strong).toBe(true);
        expect(getEffectiveState(fragment.annotations, 4).strong).toBe(false);
        expect(getEffectiveState(fragment.annotations, 8).strong).toBe(true);
        expect(render(fragment)).toBe(
            "<strong>abc</strong>defg<strong>hij</strong>"
        );
    });

    test("later annotations win when re-enabling after an inverse annotation", () => {
        const fragment: Fragment = {
            text: "abcdefghij",
            annotations: [
                { range: [0, 10], tag: "<strong>", order: 1 },
                { range: [3, 7], tag: "</strong>", order: 2 },
                { range: [4, 6], tag: "<strong>", order: 3 }
            ]
        };

        expect(render(fragment)).toBe(
            "<strong>abc</strong>d<strong>ef</strong>g<strong>hij</strong>"
        );
    });

    test("renderer keeps a shared link open across nested inline formatting", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: [
                { range: [3, 5], tag: "<em>", order: 1 },
                { range: [0, 5], tag: `<a href="https://www.muze.nl/">`, order: 2 }
            ]
        };

        expect(render(fragment)).toBe(
            '<a href="https://www.muze.nl/">hel<em>lo</em></a>'
        );
    });

    test("renderer escapes text and link attributes", () => {
        const fragment: Fragment = {
            text: "<&>",
            annotations: [
                { range: [0, 3], tag: `<a href="https://example.com/?a=1&amp;b=&quot;x&quot;">`, order: 1 }
            ]
        };

        expect(render(fragment)).toBe(
            '<a href="https://example.com/?a=1&amp;b=&quot;x&quot;">&lt;&amp;&gt;</a>'
        );
    });

    test("adjacent runs with equal state are merged", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: [
                { range: [0, 2], tag: "<strong>", order: 1 },
                { range: [2, 5], tag: "<strong>", order: 2 }
            ]
        };

        expect(generateRuns(fragment)).toEqual([
            {
                start: 0,
                end: 5,
                state: {
                    strong: true,
                    em: false,
                    underline: false,
                    link: null
                }
            }
        ]);
    });
});
