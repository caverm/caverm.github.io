export interface CategoryDefinition {
	id: string;
	name: string;
	parentId?: string | null;
	order?: number;
}

export interface ClassifiedPost {
	id: string;
	data: { categoryId: string; draft?: boolean; tags: string[] };
}

function fail(code: string, location: string, value: unknown): never {
	throw new Error(`${code}: ${location} = ${JSON.stringify(value)}`);
}

/** Validate the complete graph and all posts, including drafts, before filtering. */
export function createTaxonomy(
	input: CategoryDefinition[],
	posts: ClassifiedPost[],
) {
	if (!Array.isArray(input))
		fail("CATEGORY_INVALID_LIST", "src/data/categories.json", input);
	const definitions = input.map((item, index) => {
		const location = `src/data/categories.json[${index}]`;
		if (!item || typeof item !== "object" || Array.isArray(item))
			fail("CATEGORY_INVALID_OBJECT", location, item);
		if (typeof item.id !== "string")
			fail("CATEGORY_INVALID_ID", `${location}.id`, item.id);
		if (typeof item.name !== "string")
			fail("CATEGORY_INVALID_NAME", `${location}.name`, item.name);
		if (
			item.parentId !== undefined &&
			item.parentId !== null &&
			typeof item.parentId !== "string"
		)
			fail("CATEGORY_INVALID_PARENT", `${location}.parentId`, item.parentId);
		if (
			item.order !== undefined &&
			(typeof item.order !== "number" || !Number.isFinite(item.order))
		)
			fail("CATEGORY_INVALID_ORDER", `${location}.order`, item.order);
		return {
			...item,
			parentId:
				item.parentId === "" || item.parentId === null
					? undefined
					: item.parentId,
		};
	});
	const byId = new Map<string, (typeof definitions)[number]>();
	const normalizedIds = new Set<string>();
	for (const [index, item] of definitions.entries()) {
		const location = `src/data/categories.json[${index}]`;
		const normalized = item.id.trim().toLowerCase();
		if (normalizedIds.has(normalized))
			fail("CATEGORY_DUPLICATE_ID", `${location}.id`, item.id);
		normalizedIds.add(normalized);
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id))
			fail("CATEGORY_INVALID_ID", `${location}.id`, item.id);
		if (!item.name.trim())
			fail("CATEGORY_EMPTY_NAME", `${location}.name`, item.name);
		byId.set(item.id, item);
	}
	const children = new Map<
		string | undefined,
		(typeof definitions)[number][]
	>();
	for (const item of definitions) {
		if (item.parentId !== undefined && !byId.has(item.parentId))
			fail(
				"CATEGORY_MISSING_PARENT",
				`src/data/categories.json.${item.id}.parentId`,
				item.parentId,
			);
		const siblings = children.get(item.parentId) ?? [];
		siblings.push(item);
		children.set(item.parentId, siblings);
	}
	for (const siblings of children.values())
		siblings.sort(
			(a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id),
		);
	const state = new Map<string, "visiting" | "done">();
	function visit(id: string) {
		if (state.get(id) === "visiting")
			fail(
				"CATEGORY_CYCLE",
				`src/data/categories.json.${id}.parentId`,
				byId.get(id)?.parentId,
			);
		if (state.get(id) === "done") return;
		state.set(id, "visiting");
		const parent = byId.get(id)?.parentId;
		if (parent) visit(parent);
		state.set(id, "done");
	}
	for (const id of byId.keys()) visit(id);
	for (const post of posts) {
		if (!byId.has(post.data.categoryId))
			fail(
				"POST_MISSING_CATEGORY",
				`src/content/posts/${post.id}.categoryId`,
				post.data.categoryId,
			);
	}
	function ancestors(id: string): CategoryDefinition[] {
		const result: CategoryDefinition[] = [];
		let current = byId.get(id);
		while (current) {
			result.unshift(current);
			current = current.parentId ? byId.get(current.parentId) : undefined;
		}
		return result;
	}
	function descendants(id: string): Set<string> {
		const ids = new Set<string>();
		const pending = [id];
		while (pending.length) {
			const next = pending.pop();
			if (!next || ids.has(next)) continue;
			ids.add(next);
			for (const child of children.get(next) ?? []) pending.push(child.id);
		}
		return ids;
	}
	function postsIn<T extends ClassifiedPost>(id: string, candidates: T[]): T[] {
		const ids = descendants(id);
		const unique = new Map<string, T>();
		for (const post of candidates) {
			if (post.data.draft !== true && ids.has(post.data.categoryId))
				unique.set(post.id, post);
		}
		return [...unique.values()];
	}
	return { byId, children, ancestors, descendants, postsIn };
}

export function publishedOnly<T extends ClassifiedPost>(posts: T[]): T[] {
	return posts.filter((post) => post.data.draft !== true);
}

export function uniqueTags(tags: string[]): string[] {
	return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}
