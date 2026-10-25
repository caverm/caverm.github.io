// The static archive is complete before navigation; query filtering needs no island download.
export function filterArchive(root: ParentNode, search: string) {
	const panel = root.querySelector<HTMLElement>("#archive-panel");
	if (!panel) return;
	const params = new URLSearchParams(search);
	const tags = params.getAll("tag");
	const categories = params.getAll("category");
	for (const group of panel.querySelectorAll<HTMLElement>(
		"[data-archive-year]",
	)) {
		let count = 0;
		for (const row of group.querySelectorAll<HTMLElement>(
			"[data-archive-post]",
		)) {
			const rowTags: string[] = JSON.parse(row.dataset.tags || "[]");
			const category = row.dataset.category || "";
			const visible =
				(!tags.length || rowTags.some((tag) => tags.includes(tag))) &&
				(!categories.length || categories.includes(category)) &&
				(!params.get("uncategorized") || !category);
			row.hidden = !visible;
			// The legacy row uses !block, so the hidden attribute alone cannot override it.
			row.style.display = visible ? "" : "none";
			if (!visible) row.style.setProperty("display", "none", "important");
			if (visible) count++;
		}
		group.hidden = count === 0;
		const label = group.querySelector<HTMLElement>("[data-archive-count]");
		if (label)
			label.textContent = `${count} ${count === 1 ? label.dataset.singular : label.dataset.plural}`;
	}
	panel.dataset.ready = "true";
	panel.style.visibility = "visible";
}
