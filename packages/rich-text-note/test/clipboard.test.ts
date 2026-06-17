import { describe, expect, it, test } from "vitest";
import { COBALT_CLIPBOARD_MIME, readFragmentFromClipboard, writeFragmentToClipboard } from "../src/clipboard";
import { Fragment, insertFragment, sliceFragment } from "../src/fragment";

class FakeDataTransfer {
    private data = new Map<string, string>();

    setData(type: string, value: string): void {
        this.data.set(type, value);
    }

    getData(type: string): string {
        return this.data.get(type) ?? "";
    }
}

describe("clipboard fragments", () => {
    it("slices selected text and overlapping annotations", () => {
        const fragment: Fragment = {
            text: "hello world",
            annotations: [
                { range: [0, 5], tag: "<strong>", order: 1 },
                { range: [3, 8], tag: "<em>", order: 2 }
            ]
        };

        expect(sliceFragment(fragment, 3, 8)).toEqual({
            text: "lo wo",
            annotations: [
                { range: [0, 2], tag: "<strong>", order: 1 },
                { range: [0, 5], tag: "<em>", order: 2 }
            ]
        });
    });

    it("writes both plain text and cobalt fragment data", () => {
        const fragment: Fragment = {
            text: "hello",
            annotations: [
                { range: [0, 5], tag: "<strong>", order: 1 }
            ]
        };
        const data = new FakeDataTransfer();

        writeFragmentToClipboard(data as unknown as DataTransfer, fragment);

        expect(data.getData("text/plain")).toBe("hello");
        expect(JSON.parse(data.getData(COBALT_CLIPBOARD_MIME))).toEqual(fragment);
    });

    it("reads cobalt data before falling back to plain text", () => {
        const data = new FakeDataTransfer();
        data.setData("text/plain", "plain");
        data.setData(COBALT_CLIPBOARD_MIME, JSON.stringify({
            text: "rich",
            annotations: [
                { range: [0, 4], tag: "<em>", order: 3 }
            ]
        }));

        expect(readFragmentFromClipboard(data as unknown as DataTransfer)).toEqual({
            text: "rich",
            annotations: [
                { range: [0, 4], tag: "<em>", order: 3 }
            ]
        });
    });

    it("inserts pasted fragments with shifted ranges and fresh order", () => {
        const target: Fragment = {
            text: "hello",
            annotations: [
                { range: [0, 5], tag: "<strong>", order: 10 }
            ]
        };
        const pasted: Fragment = {
            text: "XX",
            annotations: [
                { range: [0, 2], tag: "<em>", order: 1 }
            ]
        };

        insertFragment(target, 5, pasted);

        expect(target).toEqual({
            text: "helloXX",
            annotations: [
                { range: [0, 7], tag: "<strong>", order: 10 },
                { range: [5, 7], tag: "<em>", order: 11 }
            ]
        });
    });
});
