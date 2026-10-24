import "./require-docker.mjs";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [directory = "dist", base = "/"] = process.argv.slice(2);
const origin = process.env.SITE_URL || "https://example.github.io";
function files(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
		item.isDirectory()
			? files(path.join(dir, item.name))
			: [path.join(dir, item.name)],
	);
}
let checked = 0;
for (const file of files(directory)) {
	const buffer = readFileSync(file);
	for (const canary of [
		"DRAFT_PRIVATE_CANARY_7F3",
		"draft-private-canary-7f3",
		"비공개초안표식",
	])
		assert(!buffer.includes(Buffer.from(canary)), `draft leaked into ${file}`);
	if (!file.endsWith(".html")) continue;
	const html = buffer.toString();
	const relative = path
		.relative(directory, file)
		.split(path.sep)
		.join("/")
		.replace(/index\.html$/, "");
	const expected = new URL(`${base}${relative}`, origin).href;
	assert(
		html.includes(`rel="canonical" href="${expected}"`),
		`canonical ${file}: ${expected}`,
	);
	assert(
		html.includes(`href="${new URL(`${base}rss.xml`, origin).href}"`),
		`RSS alternate ${file}`,
	);
	const references = [...html.matchAll(/(?:href|src)="([^"<>]+)"/g)].map(
		(match) => match[1],
	);
	for (const match of html.matchAll(/srcset="([^"<>]+)"/g))
		references.push(
			...match[1]
				.split(",")
				.map((candidate) => candidate.trim().split(/\s+/)[0]),
		);
	for (const reference of references) {
		const raw = reference.replaceAll("&amp;", "&");
		if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) continue;
		const resolved = new URL(raw, `https://local.test${base}${relative}`);
		assert(resolved.pathname.startsWith(base), `missing base ${file}: ${raw}`);
		const stripped = decodeURIComponent(resolved.pathname.slice(base.length));
		const target = path.resolve(directory, stripped);
		assert(target.startsWith(path.resolve(directory)), `outside output ${raw}`);
		assert(
			existsSync(target) || existsSync(path.join(target, "index.html")),
			`broken URL ${file}: ${raw}`,
		);
		checked++;
	}
}
const robots = readFileSync(path.join(directory, "robots.txt"), "utf8");
assert(
	robots.includes(new URL(`${base}sitemap-index.xml`, origin).href),
	"robots sitemap base",
);
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
assert(cmsPost.includes("cmsSyntheticExample"), "CMS fenced code is rendered");
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
for (const match of rss
	.replaceAll("&quot;", '"')
	.replaceAll("&amp;", "&")
	.matchAll(/src="([^"]+)"/g)) {
	const address = new URL(match[1]);
	if (address.origin !== new URL(origin).origin) continue;
	assert(
		address.pathname.startsWith(base),
		`RSS image missing base: ${address}`,
	);
	assert(
		existsSync(
			path.join(
				directory,
				decodeURIComponent(address.pathname.slice(base.length)),
			),
		),
	);
}
