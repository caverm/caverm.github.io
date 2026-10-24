export const MAX_SOURCE_TEXT_BYTES = 1024 * 1024;

export function assertSourceTextSize(file, size) {
	if (
		/\.(?:[cm]?[jt]sx?|astro|svelte|mdx?|json|txt|ya?ml|css|styl|scss|sass|less)$/i.test(
			file,
		) &&
		size > MAX_SOURCE_TEXT_BYTES
	)
		throw new Error(
			`SEC-CONTENT-02: source text exceeds ${MAX_SOURCE_TEXT_BYTES} bytes: ${file}`,
		);
}
