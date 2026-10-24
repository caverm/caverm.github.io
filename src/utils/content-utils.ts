import { type CollectionEntry, getCollection } from "astro:content";
import definitions from "../data/categories.json";
import { createTaxonomy, publishedOnly, uniqueTags } from "./taxonomy";
import { getCategoryUrl } from "./url-utils";

export const taxonomy = createTaxonomy(definitions, []);

async function getRawSortedPosts() {
	const allPosts = await getCollection("posts");
	createTaxonomy(definitions, allPosts);
	return publishedOnly(allPosts)
		.map((post) => ({
			...post,
			data: { ...post.data, tags: uniqueTags(post.data.tags) },
		}))
		.sort(
			(a, b) =>
				b.data.published.getTime() - a.data.published.getTime() ||
				a.slug.localeCompare(b.slug),
		);
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();
	return sorted.map((post, index) => ({
		...post,
		data: {
			...post.data,
			nextSlug: sorted[index - 1]?.slug ?? "",
			nextTitle: sorted[index - 1]?.data.title ?? "",
			prevSlug: sorted[index + 1]?.slug ?? "",
			prevTitle: sorted[index + 1]?.data.title ?? "",
		},
	}));
}

export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	return (await getRawSortedPosts()).map((post) => ({
		slug: post.slug,
		data: post.data,
	}));
}

export type Tag = { name: string; count: number };
export async function getTagList(): Promise<Tag[]> {
	const counts = new Map<string, number>();
	for (const post of await getRawSortedPosts()) {
		for (const tag of post.data.tags)
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}
	return [...counts]
		.sort(([a], [b]) => a.localeCompare(b, "ko"))
		.map(([name, count]) => ({ name, count }));
}

export async function getCategoryList() {
	const posts = await getRawSortedPosts();
	return definitions.map((category) => ({
		...category,
		count: taxonomy.postsIn(category.id, posts).length,
		url: getCategoryUrl(category.id),
	}));
}
