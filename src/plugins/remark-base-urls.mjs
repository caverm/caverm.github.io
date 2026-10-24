import { visit } from "unist-util-visit";
export function remarkBaseUrls({ base = "/" } = {}) {
	const prefix = `/${base.split("/").filter(Boolean).join("/")}/`.replace(
		/\/+/g,
		"/",
	);
	return (tree) =>
		visit(tree, (node) => {
			if (
				(node.type === "image" ||
					node.type === "link" ||
					node.type === "definition") &&
				typeof node.url === "string" &&
				node.url.startsWith("/") &&
				!node.url.startsWith("//")
			) {
				if (prefix !== "/") node.url = prefix + node.url.slice(1);
			}
		});
}
