import "./require-docker.mjs";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getDraftSlugs } from "./lib/draft-routes.mjs";
import {
	assertDraftsAbsent,
	checkStaticOutput,
	outputFiles,
} from "./lib/static-output.mjs";

const [directory = "dist", base = "/"] = process.argv.slice(2);
const origin = process.env.SITE_URL || "https://example.github.io";
const checked = checkStaticOutput(directory, base, origin);
if (process.argv.includes("--publish")) {
	assertDraftsAbsent(directory, base, getDraftSlugs());
	console.log(
		`Publication artifact checks passed: ${directory}, base ${base}, ${checked} local references.`,
	);
} else {
	for (const file of outputFiles(directory)) {
		const buffer = readFileSync(file);
		for (const canary of [
			"DRAFT_PRIVATE_CANARY_7F3",
			"draft-private-canary-7f3",
			"비공개초안표식",
		])
			assert(
				!buffer.includes(Buffer.from(canary)),
				`draft leaked into ${file}`,
			);
	}
	const sitemap = readFileSync(path.join(directory, "sitemap-0.xml"), "utf8");
	assert(
		sitemap.includes(new URL(`${base}posts/deep-code/`, origin).href),
		"sitemap post base",
	);
	const rss = readFileSync(path.join(directory, "rss.xml"), "utf8");
	const cmsPost = readFileSync(
		path.join(directory, "posts/cms-saved-example/index.html"),
		"utf8",
	);
	assert(
		cmsPost.includes("로컬에서 확인하는 저장 형식"),
		"CMS fixture is published",
	);
	assert(
		cmsPost.includes("cmsSyntheticExample"),
		"CMS fenced code is rendered",
	);
	assert(
		cmsPost.includes(`${base}images/notes.svg`),
		"CMS Markdown image uses the correct base",
	);
	assert(
		cmsPost.includes(`href="${base}about/"`),
		"CMS Markdown link uses the correct base",
	);
	assert(
		rss.includes(new URL(`${base}posts/cms-saved-example/`, origin).href),
		"CMS quoted-date and blank-updated fixture reaches the feed",
	);
	assert(
		rss.includes(new URL(`${base}posts/deep-code/`, origin).href),
		"RSS post base",
	);
	assert(
		rss.includes(new URL(`${base}images/notes.svg`, origin).href),
		"RSS markdown image base",
	);
	assert(
		!existsSync(
			path.join(directory, "posts/draft-private-canary-7f3/index.html"),
		),
		"draft direct route exists",
	);
	console.log(
		`Artifact checks passed: ${directory}, base ${base}, ${checked} local links/assets.`,
	);

	assert(
		rss.includes(`${base}_astro/figure.`),
		"RSS relative local image resolves to a built asset",
	);
}
