import { defineCollection, z } from "astro:content";
import { normalizeContentDate } from "../utils/content-date";
import { tagsSchema } from "../utils/tags-schema";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.preprocess((value) => normalizeContentDate(value), z.date()),
		updated: z.preprocess(
			(value) => normalizeContentDate(value, true),
			z.date().optional(),
		),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: tagsSchema,
		categoryId: z.string().min(1),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
export const collections = {
	posts: postsCollection,
	spec: specCollection,
};
