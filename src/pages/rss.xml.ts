import path from "node:path";
import rss from "@astrojs/rss";
import { getSortedPosts } from "@utils/content-utils";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

const parser = new MarkdownIt();
const localImages = import.meta.glob<string>(
	"../content/posts/**/*.{png,jpg,jpeg,gif,webp,svg}",
	{ eager: true, query: "?url&no-inline", import: "default" },
);

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

export async function GET(context: APIContext) {
	const blog = await getSortedPosts();

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: new URL(url("/"), context.site),
		items: blog.map((post) => {
			const content =
				typeof post.body === "string" ? post.body : String(post.body || "");
			const cleanedContent = stripInvalidXmlChars(content);
			function imageUrl(src: string): string {
				if (src.startsWith("/")) return new URL(url(src), context.site).href;
				if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
				const key = path.posix.normalize(
					path.posix.join("../content/posts", path.posix.dirname(post.id), src),
				);
				const asset = localImages[key];
				if (!asset)
					throw new Error(
						`RSS_IMAGE_NOT_FOUND: src/content/posts/${post.id} image ${src}`,
					);
				return new URL(asset, context.site).href;
			}
			return {
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || "",
				link: url(`/posts/${post.slug}/`),
				content: sanitizeHtml(parser.render(cleanedContent), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
					transformTags: {
						img: (tagName, attribs) => ({
							tagName,
							attribs: {
								...attribs,
								src: imageUrl(attribs.src),
							},
						}),
						a: (tagName, attribs) => ({
							tagName,
							attribs: {
								...attribs,
								href: attribs.href?.startsWith("/")
									? new URL(url(attribs.href), context.site).href
									: attribs.href,
							},
						}),
					},
				}),
			};
		}),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
