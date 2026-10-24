/** Prefix a logical, base-free site route. Already-prefixed Astro URLs must not use this helper. */
export function withBase(path: string, base = "/"): string {
	if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;
	const prefix = `/${base.split("/").filter(Boolean).join("/")}/`.replace(
		/\/+/g,
		"/",
	);
	return `${prefix}${path.replace(/^\/+/, "")}`;
}
