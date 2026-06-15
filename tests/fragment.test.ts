import {
    addAnnotation,
    deleteRange,
    Fragment,
    insertText
} from "../src/fragment.js";

describe("fragment range transforms", () => {
    test("insert before annotation start shifts the annotation", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: [
                { range: [1, 3], tag: "<strong>", order: 1 }
            ]
        };

        insertText(fragment, 1, "X");

        expect(fragment.text).toBe("hXello");
        expect(fragment.annotations[0].range).toEqual([2, 4]);
    });

    test("insert at annotation end grows the annotation", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: [
                { range: [1, 3], tag: "<strong>", order: 1 }
            ]
        };

        insertText(fragment, 3, "X");

        expect(fragment.text).toBe("helXlo");
        expect(fragment.annotations[0].range).toEqual([1, 4]);
    });

    test("delete inside annotation shrinks the annotation", () => {
        const fragment: Fragment = {
            text: "abcdefghij",
            annotations: [
                { range: [2, 8], tag: "<em>", order: 1 }
            ]
        };

        deleteRange(fragment, 4, 6);

        expect(fragment.text).toBe("abcdghij");
        expect(fragment.annotations[0].range).toEqual([2, 6]);
    });

    test("delete across annotation preserves surviving annotated text", () => {
        const fragment: Fragment = {
            text: "abcdefghij",
            annotations: [
                { range: [2, 8], tag: "<em>", order: 1 }
            ]
        };

        deleteRange(fragment, 0, 4);

        expect(fragment.text).toBe("efghij");
        expect(fragment.annotations[0].range).toEqual([0, 4]);
    });

    test("delete entire annotation removes it", () => {
        const fragment: Fragment = {
            text: "abcdefghij",
            annotations: [
                { range: [2, 8], tag: "<em>", order: 1 }
            ]
        };

        deleteRange(fragment, 1, 9);

        expect(fragment.text).toBe("aj");
        expect(fragment.annotations).toHaveLength(0);
    });

    test("empty annotation ranges are ignored", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: []
        };

        expect(addAnnotation(fragment, [2, 2], "<strong>")).toBeNull();
        expect(fragment.annotations).toHaveLength(0);
    });
});
