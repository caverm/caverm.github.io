import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
	assertSourceTextSize,
	MAX_SOURCE_TEXT_BYTES,
} from "../scripts/lib/source-limits.mjs";
import { MAX_POST_TAGS, tagsSchema } from "../src/utils/tags-schema.ts";

test("post tags preserve defaults and valid values at the capacity boundary", () => {
	assert.deepEqual(tagsSchema.parse(undefined), []);
	assert.deepEqual(tagsSchema.parse([]), []);
	for (const length of [63, 64]) {
		const tags = Array.from({ length }, (_, index) => `synthetic-${index}`);
		assert.deepEqual(tagsSchema.parse(tags), tags);
	}
	assert.equal(tagsSchema.safeParse(["valid", 42]).success, false);
	assert.equal(tagsSchema.safeParse("invalid").success, false);
});

test("oversized invalid tags abort before reading any elements", () => {
	for (const length of [65, 1_000_000]) {
		let reads = 0;
		const oversized = new Array(length);
		Object.defineProperty(oversized, "0", {
			get() {
				reads++;
				throw new Error("Element validation must not run");
			},
		});
		const result = tagsSchema.safeParse(oversized);
		assert.equal(result.success, false);
		if (result.success) throw new Error("Oversized input was accepted");
		assert.equal(reads, 0);
		assert.equal(result.error.issues.length, 1);
		assert.equal(result.error.issues[0].code, "too_big");
		assert.equal(result.error.issues[0].fatal, true);
		assert.equal(result.error.issues[0].maximum, MAX_POST_TAGS);
	}
});

test("source text is limited before reading, independently of extension case", () => {
	for (const file of [
		"src/content/posts/note.md",
		"src/content/posts/note.MD",
		"src/data/categories.JSON",
		"public/data.yml",
	]) {
		assert.doesNotThrow(() =>
			assertSourceTextSize(file, MAX_SOURCE_TEXT_BYTES),
		);
		assert.throws(
			() => assertSourceTextSize(file, MAX_SOURCE_TEXT_BYTES + 1),
			/SEC-CONTENT-02/,
		);
	}
	assert.doesNotThrow(() =>
		assertSourceTextSize("public/images/photo.PNG", 2 * MAX_SOURCE_TEXT_BYTES),
	);
	assert.doesNotThrow(() =>
		assertSourceTextSize("public/images/figure.svg", 2 * MAX_SOURCE_TEXT_BYTES),
	);
});

test("the actual source preflight rejects oversized content before scanning its data", () => {
	const directory = mkdtempSync(path.join(tmpdir(), "content-preflight-"));
	try {
		mkdirSync(path.join(directory, "src/content/posts"), { recursive: true });
		mkdirSync(path.join(directory, "public"));
		writeFileSync(
			path.join(directory, "src/content/posts/oversized.MD"),
			`-----BEGIN PRIVATE KEY-----${"x".repeat(MAX_SOURCE_TEXT_BYTES)}`,
		);
		const result = spawnSync(
			process.execPath,
			[path.resolve("scripts/security.mjs")],
			{ cwd: directory, encoding: "utf8" },
		);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /SEC-CONTENT-02/);
		assert.doesNotMatch(result.stderr, /SEC-SECRET-01/);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
