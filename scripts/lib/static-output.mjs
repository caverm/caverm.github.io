import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export function outputFiles(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? outputFiles(path.join(directory, entry.name))
			: [path.join(directory, entry.name)],
	);
}

export function checkStaticOutput(directory, base, origin) {
	assert(
		base.startsWith("/") && base.endsWith("/"),
		"Output base must have leading and trailing slashes",
	);
	const site = new URL(origin);
	const root = path.resolve(directory);
	let checked = 0;
	function reference(raw, relative = "", field = "output: reference") {
		if (!raw || raw.startsWith("#")) return;
		let address;
		try {
			address = new URL(
				raw.replaceAll("&amp;", "&"),
				new URL(`${base}${relative}`, site),
			);
		} catch {
			throw new Error(`${field}: invalid URL`);
		}
		if (
			!["http:", "https:"].includes(address.protocol) ||
			address.origin !== site.origin
		)
			return;
		assert(
			address.pathname.startsWith(base),
			`${field}: Local output reference is missing the configured base`,
		);
		const target = path.resolve(
			root,
			decodeURIComponent(address.pathname.slice(base.length)),
		);
		const relativeTarget = path.relative(root, target);
		assert(
			!relativeTarget.startsWith("..") && !path.isAbsolute(relativeTarget),
			`${field}: Local reference escapes the output directory`,
		);
		assert(
			(existsSync(target) && statSync(target).isFile()) ||
				(existsSync(path.join(target, "index.html")) &&
					statSync(path.join(target, "index.html")).isFile()),
			`${field}: Broken local output link or image`,
		);
		checked++;
	}
	assert(
		existsSync(path.join(root, "index.html")),
		`${directory}/index.html: Published home page is missing`,
	);
	for (const file of outputFiles(directory).filter((file) =>
		file.endsWith(".html"),
	)) {
		const html = readFileSync(file, "utf8");
		const relative = path
			.relative(directory, file)
			.split(path.sep)
			.join("/")
			.replace(/index\.html$/, "");
		assert(
			html.includes(
				`rel="canonical" href="${new URL(`${base}${relative}`, site).href}"`,
			),
			`${file}: canonical does not match its output route`,
		);
		assert(
			html.includes(`href="${new URL(`${base}rss.xml`, site).href}"`),
			`${file}: RSS alternate is missing`,
		);
		for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g))
			reference(match[1], relative, `${file}: href/src`);
		for (const match of html.matchAll(/srcset="([^"<>]+)"/g))
			for (const candidate of match[1].split(","))
				reference(
					candidate.trim().split(/\s+/)[0],
					relative,
					`${file}: srcset`,
				);
	}
	const robots = readFileSync(path.join(root, "robots.txt"), "utf8");
	assert(
		robots.includes(new URL(`${base}sitemap-index.xml`, site).href),
		`${directory}/robots.txt: sitemap does not match the configured base`,
	);
	for (const name of ["sitemap-index.xml", "sitemap-0.xml", "rss.xml"]) {
		const xml = readFileSync(path.join(root, name), "utf8");
		for (const match of xml.matchAll(
			/<(?:loc|link|guid)(?:\s[^>]*)?>([^<]+)<\/(?:loc|link|guid)>/g,
		))
			reference(match[1], "", `${directory}/${name}: loc/link/guid`);
		const decoded = xml.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
		for (const match of decoded.matchAll(/src="([^"]+)"/g))
			reference(match[1], "", `${directory}/${name}: src`);
	}
	return checked;
}

export function assertDraftsAbsent(directory, base, slugs) {
	const routes = slugs.flatMap((slug) => [
		`${base}posts/${slug}/`,
		`${base}posts/${encodeURI(slug)}/`,
	]);
	for (const slug of slugs)
		assert(
			!existsSync(path.join(directory, "posts", slug, "index.html")),
			`${directory}/posts/${slug}/index.html: draft public route exists`,
		);
	for (const file of outputFiles(directory)) {
		const content = readFileSync(file, "utf8").replaceAll("\\/", "/");
		assert(
			!routes.some((route) => {
				let start = content.indexOf(route);
				while (start !== -1) {
					const next = content[start + route.length];
					if (
						next === undefined ||
						next.charCodeAt(0) === 0 ||
						/[\s"'<>?#\\]/.test(next)
					)
						return true;
					start = content.indexOf(route, start + route.length);
				}
				return false;
			}),
			`${file}: draft route leaked into published output or an index`,
		);
	}
}
