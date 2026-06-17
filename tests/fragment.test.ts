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
