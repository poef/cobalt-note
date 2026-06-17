import {
    addAnnotation,
    deleteRange,
    Fragment,
    insertText,
    splitFragment
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


    test("newline insertion at annotation end does not grow annotation when requested", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: [
                { range: [0, 5], tag: "<strong>", order: 1 }
            ]
        };

        insertText(fragment, 5, "\n", { growAtEnd: false });

        expect(fragment.text).toBe("hello\n");
        expect(fragment.annotations[0].range).toEqual([0, 5]);
    });

    test("newline insertion inside annotation keeps annotation intact", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: [
                { range: [0, 5], tag: "<strong>", order: 1 }
            ]
        };

        insertText(fragment, 3, "\n", { growAtEnd: false });

        expect(fragment.text).toBe("hel\nlo");
        expect(fragment.annotations[0].range).toEqual([0, 6]);
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

describe("fragment splitting", () => {
    test("splitFragment divides text and moves annotations into the second fragment", () => {
        const fragment: Fragment = {
            text: "hello world",
            annotations: [
                { range: [6, 11], tag: "<strong>", order: 1 }
            ]
        };

        const result = splitFragment(fragment, 6);

        expect(result.before).toEqual({
            text: "hello ",
            annotations: []
        });

        expect(result.after).toEqual({
            text: "world",
            annotations: [
                { range: [0, 5], tag: "<strong>", order: 1 }
            ]
        });
    });

    test("splitFragment splits annotations that cross the split point", () => {
        const fragment: Fragment = {
            text: "hello world",
            annotations: [
                { range: [0, 11], tag: "<em>", order: 1 }
            ]
        };

        const result = splitFragment(fragment, 6);

        expect(result.before.annotations).toEqual([
            { range: [0, 6], tag: "<em>", order: 1 }
        ]);

        expect(result.after.annotations).toEqual([
            { range: [0, 5], tag: "<em>", order: 1 }
        ]);
    });
});

describe("fragment joining", () => {
    test("joinFragments inserts a newline between non-empty notes", async () => {
        const { joinFragments } = await import("../src/fragment.js");

        const first: Fragment = {
            text: "hello",
            annotations: [
                { range: [0, 5], tag: "<strong>", order: 1 }
            ]
        };

        const second: Fragment = {
            text: "world",
            annotations: [
                { range: [0, 5], tag: "<em>", order: 2 }
            ]
        };

        const result = joinFragments(first, second);

        expect(result.joinOffset).toBe(6);
        expect(result.fragment.text).toBe("hello\nworld");
        expect(result.fragment.annotations).toEqual([
            { range: [0, 5], tag: "<strong>", order: 1 },
            { range: [6, 11], tag: "<em>", order: 2 }
        ]);
    });

    test("joinFragments does not add another newline when one already exists", async () => {
        const { joinFragments } = await import("../src/fragment.js");

        const result = joinFragments(
            { text: "hello\n", annotations: [] },
            { text: "world", annotations: [] }
        );

        expect(result.joinOffset).toBe(6);
        expect(result.fragment.text).toBe("hello\nworld");
    });

    test("joinFragments does not add a newline when the second note starts with one", async () => {
        const { joinFragments } = await import("../src/fragment.js");

        const result = joinFragments(
            { text: "hello", annotations: [] },
            { text: "\nworld", annotations: [] }
        );

        expect(result.joinOffset).toBe(6);
        expect(result.fragment.text).toBe("hello\nworld");
    });
});

describe("annotation coalescing", () => {
    test("deleteRange merges adjacent annotations with the same tag and order", async () => {
        const { deleteRange } = await import("../src/fragment.js");

        const fragment: Fragment = {
            text: "hello\nworld",
            annotations: [
                { range: [0, 5], tag: "<em>", order: 1 },
                { range: [6, 11], tag: "<em>", order: 1 }
            ]
        };

        deleteRange(fragment, 5, 6);

        expect(fragment.text).toBe("helloworld");
        expect(fragment.annotations).toEqual([
            { range: [0, 10], tag: "<em>", order: 1 }
        ]);
    });

    test("deleteRange does not merge adjacent annotations with different order", async () => {
        const { deleteRange } = await import("../src/fragment.js");

        const fragment: Fragment = {
            text: "hello\nworld",
            annotations: [
                { range: [0, 5], tag: "<em>", order: 1 },
                { range: [6, 11], tag: "<em>", order: 2 }
            ]
        };

        deleteRange(fragment, 5, 6);

        expect(fragment.annotations).toEqual([
            { range: [0, 5], tag: "<em>", order: 1 },
            { range: [5, 10], tag: "<em>", order: 2 }
        ]);
    });

    test("join then removing the inserted newline restores a split annotation", async () => {
        const {
            deleteRange,
            joinFragments,
            splitFragment
        } = await import("../src/fragment.js");

        const original: Fragment = {
            text: "helloworld",
            annotations: [
                { range: [0, 10], tag: "<strong>", order: 1 }
            ]
        };

        const split = splitFragment(original, 5);
        const joined = joinFragments(split.before, split.after).fragment;

        expect(joined.annotations).toEqual([
            { range: [0, 5], tag: "<strong>", order: 1 },
            { range: [6, 11], tag: "<strong>", order: 1 }
        ]);

        deleteRange(joined, 5, 6);

        expect(joined.text).toBe("helloworld");
        expect(joined.annotations).toEqual([
            { range: [0, 10], tag: "<strong>", order: 1 }
        ]);
    });
});
