import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Reuse the parser and slugger already supplied by the pinned Astro toolchain.
const requireAstro = createRequire(import.meta.resolve("astro/package.json"));
const { parseFrontmatter } = requireAstro("@astrojs/markdown-remark");
const { slug: githubSlug } = requireAstro("github-slugger");

export function getDraftSlugs(directory = "src/content/posts") {
	const slugs = [];
	function visit(folder) {
		for (const entry of readdirSync(folder, { withFileTypes: true })) {
			if (entry.name.startsWith("_")) continue;
			const file = path.join(folder, entry.name);
			if (entry.isDirectory()) {
				visit(file);
				continue;
			}
			if (!file.endsWith(".md")) continue;
			let frontmatter;
			try {
				({ frontmatter } = parseFrontmatter(readFileSync(file, "utf8")));
			} catch {
				throw new Error(`${file}: frontmatter could not be parsed`);
			}
			if (frontmatter.draft !== true) continue;
			const generated = path
				.relative(directory, file)
				.slice(0, -3)
				.split(path.sep)
				.map((segment) => githubSlug(segment))
				.join("/")
				.replace(/\/index$/, "");
			assert(
				frontmatter.slug === undefined || typeof frontmatter.slug === "string",
				`${file}: slug must be a string`,
			);
			slugs.push(frontmatter.slug ?? generated);
		}
	}
	visit(directory);
	return [...new Set(slugs)];
}
