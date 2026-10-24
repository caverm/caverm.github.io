import { readdirSync, readFileSync, statSync } from "node:fs";
import { assertSourceTextSize } from "./source-limits.mjs";

export function readAuditSources(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = `${directory}/${entry.name}`;
		if (entry.isDirectory()) return readAuditSources(path);
		assertSourceTextSize(path, statSync(path).size);
		return [
			{
				path,
				content: /\.(?:[cm]?[jt]sx?|astro|svelte|mdx?)$/i.test(path)
					? readFileSync(path, "utf8")
					: "",
			},
		];
	});
}
