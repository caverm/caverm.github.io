import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
	assertNoJsxRendering,
	assertZodContentBoundary,
} from "../scripts/lib/audit-policy.mjs";
import { readAuditSources } from "../scripts/lib/audit-sources.mjs";
import { MAX_POST_TAGS, tagsSchema } from "../src/utils/tags-schema.ts";

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

test("Zod risk boundary rejects removed early guards and added input paths", () => {
	const safe = {
		packageData: JSON.parse(readFileSync("package.json", "utf8")),
		config: readFileSync("astro.config.mjs", "utf8"),
		sources: ["src/content/config.ts", "src/utils/tags-schema.ts"].map(
			(path) => ({ path, content: readFileSync(path, "utf8") }),
		),
		tagsSchema,
		maxTags: MAX_POST_TAGS,
		entryPoints: {
			build: readFileSync("scripts/build.mjs", "utf8"),
			verify: readFileSync("scripts/verify.mjs", "utf8"),
		},
	};
	assert.doesNotThrow(() => assertZodContentBoundary(safe));
	const bad = [
		{ ...safe, sources: safe.sources.slice(0, 1) },
		{
			...safe,
			sources: safe.sources.map((source) => ({
				...source,
				content: source.content.replace(
					"tags: tagsSchema,",
					"tags: z.array(z.string()),",
				),
			})),
		},
		{
			...safe,
			sources: safe.sources.map((source) => ({
				...source,
				content: `${source.content}\nconst extra = z.set(z.string());`,
			})),
		},
		{
			...safe,
			sources: [
				...safe.sources,
				{
					path: "src/pages/api/new.ts",
					content: 'import { z } from "astro/zod";',
				},
			],
		},
		{
			...safe,
			sources: [
				...safe.sources,
				{ path: "src/new.ts", content: 'import { z } from "zod";' },
			],
		},
		{
			...safe,
			sources: [
				...safe.sources,
				{ path: "src/new.ts", content: 'import { z } from "astro:content";' },
			],
		},
		{
			...safe,
			sources: [
				...safe.sources,
				{
					path: "src/new.ts",
					content: 'import { glob } from "astro/loaders";',
				},
			],
		},
		{
			...safe,
			sources: safe.sources.map((source) => ({
				...source,
				content: `${source.content}\nconst options = {loader: remoteData};`,
			})),
		},
		{ ...safe, config: 'output: "server"' },
		{ ...safe, config: "adapter: custom()" },
		{
			...safe,
			packageData: { ...safe.packageData, dependencies: { zod: "synthetic" } },
		},
		{
			...safe,
			packageData: {
				...safe.packageData,
				scripts: {
					...safe.packageData.scripts,
					precheck: "node scripts/require-docker.mjs",
				},
			},
		},
		{ ...safe, entryPoints: { ...safe.entryPoints, build: "" } },
		{
			...safe,
			entryPoints: {
				...safe.entryPoints,
				build: safe.entryPoints.build.replace(
					'"scripts/check-build-boundaries.mjs"',
					'""',
				),
			},
		},
		{ ...safe, entryPoints: { ...safe.entryPoints, verify: "" } },
		{
			...safe,
			entryPoints: {
				...safe.entryPoints,
				build: safe.entryPoints.build.replace(
					"for (const args of [",
					'for (const args of [["cms:check"],',
				),
			},
		},
		{
			...safe,
			entryPoints: {
				...safe.entryPoints,
				build: safe.entryPoints.build.replace(
					'"exec",\n\t\t"node",',
					'"cms:check",\n\t\t"node",',
				),
			},
		},
		{
			...safe,
			entryPoints: {
				...safe.entryPoints,
				verify: `step("cms-config", ["cms:check"]);\n${safe.entryPoints.verify}`,
			},
		},
		{ ...safe, maxTags: 65 },
		{ ...safe, tagsSchema: { safeParse: () => ({ success: true }) } },
	];
	for (const changed of bad)
		assert.throws(
			() => assertZodContentBoundary(changed),
			/AUDIT_ZOD_BOUNDARY/,
		);
	const directory = mkdtempSync(path.join(tmpdir(), "audit-inputs-"));
	try {
		for (const extension of ["mts", "cts", "cjs", "MTS"]) {
			const file = `new.${extension}`;
			writeFileSync(path.join(directory, file), 'import { z } from "zod";');
			const loaded = readAuditSources(directory).find((source) =>
				source.path.endsWith(file),
			);
			assert.ok(loaded?.content.includes('"zod"'));
			assert.throws(
				() =>
					assertZodContentBoundary({
						...safe,
						sources: [...safe.sources, { ...loaded, path: `src/${file}` }],
					}),
				/AUDIT_ZOD_BOUNDARY/,
			);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
