import { withBase } from "./base-path";

export function pathsEqual(path1: string, path2: string) {
	return (
		path1.replace(/^\/|\/$/g, "").toLowerCase() ===
		path2.replace(/^\/|\/$/g, "").toLowerCase()
	);
}
export function getPostUrlBySlug(slug: string): string {
	return url(`/posts/${slug}/`);
}
export function getTagUrl(tag: string): string {
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`);
}
export function getCategoryUrl(id: string | null): string {
	return id
		? url(`/categories/${encodeURIComponent(id)}/`)
		: url("/categories/");
}
export function getDir(path: string): string {
	return path.substring(0, path.lastIndexOf("/") + 1) || "/";
}
export function url(path: string): string {
	return withBase(path, import.meta.env.BASE_URL);
}
