import assert from "node:assert/strict";
import test from "node:test";
import { assertNoJsxRendering } from "../scripts/lib/audit-policy.mjs";

test("reviewed JSX advisory boundary fails when a rendering entry point is introduced", () => {
	const safe = {
		packageData: {
			dependencies: { astro: "5.18.2", "@astrojs/svelte": "7.2.5" },
		},
		config: 'output: "static"',
		sources: [
			{ path: "src/content/posts/note.md", content: "# Trusted Markdown" },
		],
	};
	assert.doesNotThrow(() => assertNoJsxRendering(safe));
	for (const section of [
		"dependencies",
		"devDependencies",
		"optionalDependencies",
	]) {
		for (const name of [
			"@astrojs/mdx",
			"@astrojs/react",
			"@astrojs/preact",
			"@astrojs/solid-js",
		]) {
			assert.throws(
				() =>
					assertNoJsxRendering({
						...safe,
						packageData: { [section]: { [name]: "synthetic" } },
					}),
				/AUDIT_JSX_BOUNDARY/,
			);
		}
	}
	for (const extension of ["mdx", "jsx", "tsx"]) {
		assert.throws(
			() =>
				assertNoJsxRendering({
					...safe,
					sources: [{ path: `src/new.${extension}`, content: "" }],
				}),
			/AUDIT_JSX_BOUNDARY/,
		);
	}
	for (const runtime of [
		"astro:jsx",
		"astro/jsx-runtime",
		"astro/jsx/server.js",
	]) {
		assert.throws(
			() =>
				assertNoJsxRendering({
					...safe,
					sources: [
						{ path: "src/new.js", content: `import { jsx } from '${runtime}'` },
					],
				}),
			/AUDIT_JSX_BOUNDARY/,
		);
	}
	assert.throws(
		() =>
			assertNoJsxRendering({
				...safe,
				config: 'import mdx from "@astrojs/mdx"',
			}),
		/AUDIT_JSX_BOUNDARY/,
	);
});
