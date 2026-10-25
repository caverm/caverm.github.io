import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { getDraftSlugs } from "../scripts/lib/draft-routes.mjs";
import {
	assertDraftsAbsent,
	checkStaticOutput,
} from "../scripts/lib/static-output.mjs";

const requireAstro = createRequire(import.meta.resolve("astro/package.json"));
const { parse } = requireAstro("yaml");
const origin = "https://publication.example";

test("draft routes use actual frontmatter, explicit slugs and Astro nested defaults", () => {
	const directory = mkdtempSync(path.join(tmpdir(), "publish-drafts-"));
	try {
		mkdirSync(path.join(directory, "Nested Name"));
		writeFileSync(
			path.join(directory, "custom.md"),
			"---\ndraft: true\nslug: private-custom\n---\nSynthetic",
		);
		writeFileSync(
			path.join(directory, "Nested Name/index.md"),
			"---\ndraft: true\n---\nSynthetic",
		);
		writeFileSync(
			path.join(directory, "public.md"),
			"---\ndraft: false\n---\nSynthetic",
		);
		writeFileSync(
			path.join(directory, "_ignored.md"),
			"---\ndraft: true\n---\nSynthetic",
		);
		assert.deepEqual(getDraftSlugs(directory).sort(), [
			"nested-name",
			"private-custom",
		]);
		writeFileSync(
			path.join(directory, "bad.md"),
			"---\ndraft: true\nslug: 42\n---\nSynthetic",
		);
		assert.throws(
			() => getDraftSlugs(directory),
			/bad.md: slug must be a string/,
		);
		writeFileSync(
			path.join(directory, "bad.md"),
			"---\ndraft: [\n---\nSynthetic",
		);
		assert.throws(
			() => getDraftSlugs(directory),
			/bad.md: frontmatter could not be parsed/,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test("publication runner preserves nonzero exit and structured failure end without a second build", () => {
	const directory = mkdtempSync(path.join(tmpdir(), "publish-runner-"));
	try {
		const command = path.join(directory, "pnpm");
		writeFileSync(command, "#!/bin/sh\nexit 7\n");
		chmodSync(command, 0o755);
		const result = spawnSync(process.execPath, ["scripts/verify-publish.mjs"], {
			encoding: "utf8",
			env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
		});
		assert.equal(result.status, 7);
		const events = result.stdout
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		assert.equal(events.at(-1).event, "publish.verify.end");
		assert.equal(events.at(-1).result, "failed");
		assert.equal(events.at(-1).level, "ERROR");
		assert.equal(events.at(-1).module, "verify-publish");
		assert(
			events.every(
				(event) => event.jobId === events[0].jobId && event.time.endsWith("Z"),
			),
		);
		assert.equal(
			events.filter((event) => event.event === "publish.step.start").length,
			1,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

function fixture(directory, base) {
	mkdirSync(path.join(directory, "images"), { recursive: true });
	writeFileSync(path.join(directory, "images/personalized.svg"), "<svg/>");
	writeFileSync(
		path.join(directory, "index.html"),
		`<link rel="canonical" href="${origin}${base}"><link href="${origin}${base}rss.xml"><img src="${base}images/personalized.svg?v=2">`,
	);
	writeFileSync(
		path.join(directory, "robots.txt"),
		`Sitemap: ${origin}${base}sitemap-index.xml`,
	);
	writeFileSync(
		path.join(directory, "sitemap-index.xml"),
		`<loc>${origin}${base}sitemap-0.xml</loc>`,
	);
	writeFileSync(
		path.join(directory, "sitemap-0.xml"),
		`<loc>${origin}${base}</loc>`,
	);
	writeFileSync(
		path.join(directory, "rss.xml"),
		`<rss><link>${origin}${base}</link><description>&lt;p&gt;Synthetic&lt;/p&gt;</description></rss>`,
	);
}

test("publication checks accept personalized content without development fixtures and reject broken local assets", () => {
	for (const base of ["/", "/blog/"]) {
		const directory = mkdtempSync(path.join(tmpdir(), "publish-output-"));
		try {
			fixture(directory, base);
			assert(checkStaticOutput(directory, base, origin) > 0);
			rmSync(path.join(directory, "images/personalized.svg"));
			assert.throws(
				() => checkStaticOutput(directory, base, origin),
				/Broken local/,
			);
			fixture(directory, base);
			const html = readFileSync(path.join(directory, "index.html"), "utf8");
			writeFileSync(
				path.join(directory, "index.html"),
				`${html}<a href="${origin}${base}missing/">Missing</a>`,
			);
			assert.throws(
				() => checkStaticOutput(directory, base, origin),
				/Broken local/,
			);
			fixture(directory, base);
			mkdirSync(path.join(directory, "empty"));
			writeFileSync(
				path.join(directory, "index.html"),
				`${readFileSync(path.join(directory, "index.html"), "utf8")}<a href="${base}empty/">Empty</a>`,
			);
			assert.throws(
				() => checkStaticOutput(directory, base, origin),
				/index.html: href\/src: Broken local/,
			);
			fixture(directory, base);
			writeFileSync(
				path.join(directory, "rss.xml"),
				`<img src="${origin}${base}images/missing.svg">`,
			);
			assert.throws(
				() => checkStaticOutput(directory, base, origin),
				/Broken local/,
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	}
});

test("actual draft routes are rejected in pages, feed, sitemap and search output", () => {
	const directory = mkdtempSync(path.join(tmpdir(), "publish-leaks-"));
	try {
		fixture(directory, "/blog/");
		writeFileSync(
			path.join(directory, "nested-public.html"),
			'<a href="/blog/posts/a/b/">Public nested</a>',
		);
		assert.doesNotThrow(() => assertDraftsAbsent(directory, "/blog/", ["a"]));
		assert.doesNotThrow(() =>
			assertDraftsAbsent(directory, "/blog/", [
				"private-custom",
				"nested-name",
			]),
		);
		for (const name of [
			"index.html",
			"rss.xml",
			"sitemap-0.xml",
			"search.pf_fragment",
		]) {
			const file = path.join(directory, name);
			const original = name.endsWith("pf_fragment")
				? ""
				: readFileSync(file, "utf8");
			writeFileSync(file, `${original}/blog/posts/private-custom/`);
			assert.throws(
				() => assertDraftsAbsent(directory, "/blog/", ["private-custom"]),
				/draft route/i,
			);
			writeFileSync(file, original);
		}
		mkdirSync(path.join(directory, "posts/nested-name"), { recursive: true });
		writeFileSync(
			path.join(directory, "posts/nested-name/index.html"),
			"Synthetic",
		);
		assert.throws(
			() => assertDraftsAbsent(directory, "/blog/", ["nested-name"]),
			/draft.*route/i,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test("workflow deploy decisions separate main pushes, PRs, manual publish and manual full checks", () => {
	const workflow = parse(readFileSync(".github/workflows/verify.yml", "utf8"));
	const full = parse(readFileSync(".github/workflows/full-verify.yml", "utf8"));
	assert.deepEqual(workflow.on.push.branches, ["main"]);
	assert.equal(workflow.on.workflow_dispatch.inputs.publish.default, false);
	assert.equal(workflow.jobs.deploy.needs, "verify");
	for (const [event_name, ref, publish, expected] of [
		["push", "refs/heads/main", false, true],
		["push", "refs/heads/feature", false, false],
		["pull_request", "refs/heads/main", true, false],
		["workflow_dispatch", "refs/heads/main", false, false],
		["workflow_dispatch", "refs/heads/main", true, true],
		["workflow_dispatch", "refs/heads/feature", true, false],
	])
		assert.equal(
			Boolean(
				runInNewContext(workflow.jobs.deploy.if, {
					github: { event_name, ref },
					inputs: { publish },
				}),
			),
			expected,
		);
	const steps = workflow.jobs.verify.steps
		.map((step) => step.run || "")
		.join("\n");
	assert(steps.includes("pnpm verify:publish"));
	assert(!/pnpm verify(?:\s|$)/.test(steps));
	assert.deepEqual(Object.keys(full.on), ["workflow_dispatch"]);
	assert(
		full.jobs["full-verify"].steps.some((step) =>
			step.run?.includes("pnpm verify"),
		),
	);
	assert(!JSON.stringify(full).includes("actions/deploy-pages"));
	const cms = readFileSync(".github/workflows/cms-actions.yml", "utf8");
	assert(
		cms.includes("verify.yml") &&
			cms.includes("-f publish=true") &&
			cms.includes("-f publish=false"),
	);
});
