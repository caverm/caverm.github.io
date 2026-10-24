import assert from "node:assert/strict";
import test from "node:test";
import { withBase } from "../src/utils/base-path.ts";
import {
	type CategoryDefinition,
	createTaxonomy,
	publishedOnly,
	uniqueTags,
} from "../src/utils/taxonomy.ts";

const definitions: CategoryDefinition[] = [
	{ id: "root", name: "루트" },
	{ id: "child", name: "노트", parentId: "root" },
	{ id: "grandchild", name: "깊이", parentId: "child" },
	{ id: "fourth", name: "깊이", parentId: "grandchild" },
	{ id: "fifth", name: "끝", parentId: "fourth" },
	{ id: "other", name: "다른 루트" },
	{ id: "other-child", name: "노트", parentId: "other" },
	{ id: "empty", name: "빈 분류", parentId: "root" },
];
const post = (id: string, categoryId: string, draft = false) => ({
	id,
	data: { categoryId, draft, tags: [] },
});

test("deep tree, same names, direct parent posts, unique descendant counts and drafts", () => {
	const posts = [
		post("one", "root"),
		post("two", "child"),
		post("three", "fifth"),
		post("draft", "child", true),
		post("two", "child"),
		post("elsewhere", "other-child"),
	];
	const tree = createTaxonomy(definitions, posts);
	assert.deepEqual(
		tree.ancestors("fifth").map((item) => item.id),
		["root", "child", "grandchild", "fourth", "fifth"],
	);
	assert.deepEqual(
		tree.postsIn("root", posts).map((item) => item.id),
		["one", "two", "three"],
	);
	assert.deepEqual(tree.postsIn("empty", posts), []);
	assert.deepEqual(
		tree.postsIn("other-child", posts).map((item) => item.id),
		["elsewhere"],
	);
	assert.equal(
		tree.byId.get("child")?.name,
		tree.byId.get("other-child")?.name,
	);
});

test("reject duplicate normalized IDs, missing parents and cycles with location", () => {
	assert.throws(
		() =>
			createTaxonomy(
				[
					{ id: "a", name: "a" },
					{ id: " A ", name: "b" },
				],
				[],
			),
		/CATEGORY_DUPLICATE_ID.*categories.json\[1\].id/,
	);
	assert.throws(
		() => createTaxonomy([{ id: "a", name: "a", parentId: "missing" }], []),
		/CATEGORY_MISSING_PARENT.*a.parentId.*missing/,
	);
	assert.throws(
		() => createTaxonomy([{ id: "a", name: "a", parentId: "a" }], []),
		/CATEGORY_CYCLE/,
	);
	assert.throws(
		() =>
			createTaxonomy(
				[
					{ id: "a", name: "a", parentId: "b" },
					{ id: "b", name: "b", parentId: "a" },
				],
				[],
			),
		/CATEGORY_CYCLE/,
	);
	assert.throws(
		() => createTaxonomy([{ id: "../a", name: "a" }], []),
		/CATEGORY_INVALID_ID/,
	);
});

test("invalid draft references fail before publication filtering", () => {
	assert.throws(
		() => createTaxonomy(definitions, [post("draft.md", "unknown", true)]),
		/POST_MISSING_CATEGORY.*draft.md.categoryId.*unknown/,
	);
	assert.deepEqual(
		publishedOnly([post("public", "root"), post("private", "root", true)]).map(
			(item) => item.id,
		),
		["public"],
	);
	assert.deepEqual(uniqueTags(["태그", " 태그 ", "다른 태그", ""]), [
		"태그",
		"다른 태그",
	]);
});

test("category identity and URL survive label, parent and post-folder moves", () => {
	const changed = definitions.map((item) =>
		item.id === "child"
			? { ...item, name: "바꾼 이름", parentId: "other" }
			: item,
	);
	const tree = createTaxonomy(changed, [
		post("moved/folder/index.md", "child"),
	]);
	assert.equal(tree.byId.get("child")?.id, "child");
	assert.deepEqual(
		tree.ancestors("child").map((item) => item.id),
		["other", "child"],
	);
	assert.equal(
		withBase("/categories/child/", "/blog/"),
		"/blog/categories/child/",
	);
});

test("logical routes preserve queries and external links even when the base matches a route name", () => {
	assert.equal(withBase("/posts/hello/", "/"), "/posts/hello/");
	assert.equal(withBase("/posts/hello/", "/blog/"), "/blog/posts/hello/");
	assert.equal(withBase("/posts/hello/", "/posts/"), "/posts/posts/hello/");
	assert.equal(
		withBase("/categories/child/", "/categories/"),
		"/categories/categories/child/",
	);
	assert.equal(
		withBase("/archive/?tag=a%20b", "/blog/"),
		"/blog/archive/?tag=a%20b",
	);
	assert.equal(
		withBase("https://example.com/x", "/blog/"),
		"https://example.com/x",
	);
	assert.equal(withBase("#heading", "/blog/"), "#heading");
});
