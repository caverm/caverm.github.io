import { z } from "astro/zod";

export const MAX_POST_TAGS = 64;

// Zod 3 .max() still visits every element. Abort before the array parser instead.
export const tagsSchema = z.preprocess((value, context) => {
	if (Array.isArray(value) && value.length > MAX_POST_TAGS) {
		context.addIssue({
			code: "too_big",
			maximum: MAX_POST_TAGS,
			type: "array",
			inclusive: true,
			exact: false,
			fatal: true,
			message: `A post can have at most ${MAX_POST_TAGS} tags.`,
		});
		return z.NEVER;
	}
	return value;
}, z.array(z.string()).optional().default([]));
