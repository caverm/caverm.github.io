import assert from "node:assert/strict";
import test from "node:test";
import { filterArchive } from "../src/utils/archive-filter.ts";

test("archive filters tags OR, category AND, uncategorized, counts and empty years synchronously", () => {
	const row = (tags: string[], category: string) => ({
		dataset: { tags: JSON.stringify(tags), category },
		hidden: false,
		style: {
			display: "",
			setProperty(_name: string, value: string) {
				this.display = value;
			},
		},
	});
	const rows = [
		row(["a"], "one"),
		row(["b"], "two"),
		row(["a", "b"], ""),
		row([], "one"),
	];
	const label = {
		textContent: "",
		dataset: { singular: "post", plural: "posts" },
	};
	const group = {
		hidden: false,
		querySelectorAll: () => rows,
		querySelector: () => label,
	};
	const panel = {
		dataset: {} as Record<string, string>,
		style: { visibility: "hidden" },
		querySelectorAll: () => [group],
	};
	const root = { querySelector: () => panel } as unknown as ParentNode;
	for (const [search, expected] of [
		["?tag=a&tag=b", [true, true, true, false]],
		["?tag=a&category=one&category=two", [true, false, false, false]],
		["?uncategorized=1", [false, false, true, false]],
		["?tag=missing", [false, false, false, false]],
		["", [true, true, true, true]],
	] as const) {
		filterArchive(root, search);
		assert.deepEqual(
			rows.map((entry) => !entry.hidden),
			expected,
		);
		assert.deepEqual(
			rows.map((entry) => entry.style.display),
			expected.map((visible) => (visible ? "" : "none")),
		);
		const count = expected.filter(Boolean).length;
		assert.equal(
			label.textContent,
			`${count} ${count === 1 ? "post" : "posts"}`,
		);
		assert.equal(group.hidden, count === 0);
		assert.equal(panel.dataset.ready, "true");
		assert.equal(panel.style.visibility, "visible");
	}
	assert.doesNotThrow(() =>
		filterArchive(
			{ querySelector: () => null } as unknown as ParentNode,
			"?tag=a",
		),
	);
});
