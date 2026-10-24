// GHSA-98hj-9722-w3j8 remains affected in Astro 5. This site's bounded review
// requires that the JSX/MDX rendering entry points are not introduced.
export function assertNoJsxRendering({ packageData, config, sources }) {
	const dependencies = {
		...packageData.dependencies,
		...packageData.devDependencies,
		...packageData.optionalDependencies,
	};
	if (
		Object.keys(dependencies).some((name) =>
			/^@astrojs\/(?:mdx|react|preact|solid-js)$/.test(name),
		)
	)
		throw new Error(
			"AUDIT_JSX_BOUNDARY: JSX/MDX integration requires a new risk review.",
		);
	const runtime = /astro(?::jsx|\/jsx|\/runtime\/[^\s"']*jsx)/;
	if (
		runtime.test(config) ||
		/@astrojs\/(?:mdx|react|preact|solid-js)/.test(config)
	)
		throw new Error(
			"AUDIT_JSX_BOUNDARY: JSX/MDX configuration requires a new risk review.",
		);
	for (const { path, content } of sources) {
		if (/\.(?:mdx|jsx|tsx)$/i.test(path) || runtime.test(content))
			throw new Error(
				`AUDIT_JSX_BOUNDARY: review JSX/MDX rendering before using ${path}`,
			);
	}
}

// A bounded review of this trusted static build, not a general JavaScript analyzer.
export function assertZodContentBoundary({
	packageData,
	config,
	sources,
	tagsSchema,
	maxTags,
	entryPoints,
}) {
	const fail = (reason) => {
		throw new Error(`AUDIT_ZOD_BOUNDARY: ${reason}`);
	};
	if (/output:\s*["']server/.test(config) || /adapter\s*:/.test(config))
		fail("only the reviewed static build is supported.");
	for (const section of [
		"dependencies",
		"devDependencies",
		"optionalDependencies",
	])
		if (packageData[section]?.zod)
			fail("a direct Zod dependency requires a new input-path review.");
	if (
		packageData.scripts?.precheck !== "node scripts/security.mjs" ||
		packageData.scripts?.predev !== "node scripts/security.mjs" ||
		!entryPoints?.build.includes('import "./security.mjs"') ||
		!entryPoints?.verify.includes(
			'step("source-input-limits", ["exec", "node", "scripts/security.mjs"])',
		) ||
		!/^step\("source-input-limits"/.test(
			entryPoints?.verify.match(/^step\([^\n]+/m)?.[0] || "",
		)
	)
		fail(
			"check, dev, build and verify must retain their source-input preflight.",
		);
	const contentConfig = sources.find(
		(source) => source.path === "src/content/config.ts",
	);
	const helper = sources.find(
		(source) => source.path === "src/utils/tags-schema.ts",
	);
	if (
		!contentConfig ||
		!helper ||
		!/tags:\s*tagsSchema\s*[,}]/.test(contentConfig.content) ||
		!/["']\.\.\/utils\/tags-schema["']/.test(contentConfig.content)
	)
		fail("the collection must use the reviewed tags schema.");
	for (const source of sources) {
		if (!/\.(?:[cm]?[jt]sx?|astro|svelte)$/i.test(source.path)) continue;
		if (/["']astro\/loaders["']|\bloader\s*:/.test(source.content))
			fail(`a content loader requires a new input-path review: ${source.path}`);
		const collectionCalls =
			source.content.match(/\bz\.(?:array|set|map|record|tuple)\s*\(/g) || [];
		if (source.path === helper.path) {
			if (
				collectionCalls.length !== 1 ||
				!/\bz\.array\(z\.string\(\)\)/.test(source.content) ||
				/\bfetch\s*\(/.test(source.content)
			)
				fail("the tags helper's reviewed collection/input path changed.");
		} else if (collectionCalls.length)
			fail(`review the added collection schema: ${source.path}`);
		if (
			source.path !== helper.path &&
			/["'](?:zod(?:\/[^"']*)?|astro\/zod)["']/.test(source.content)
		)
			fail(`review the added Zod entry point: ${source.path}`);
		if (
			source.path !== contentConfig.path &&
			/\b(?:defineCollection|z)\b[^;]*["']astro:content["']/.test(
				source.content,
			)
		)
			fail(`review the added content schema entry point: ${source.path}`);
	}
	if (!Number.isInteger(maxTags) || maxTags < 1 || maxTags > 64)
		fail("the reviewed tag capacity must remain at most 64.");
	const oversized = new Array(maxTags + 1);
	Object.defineProperty(oversized, "0", {
		get() {
			fail("oversized tag elements reached the parser.");
		},
	});
	const result = tagsSchema.safeParse(oversized);
	if (
		result.success ||
		result.error.issues.length !== 1 ||
		result.error.issues[0].code !== "too_big" ||
		!result.error.issues[0].fatal
	)
		fail("oversized tags must abort before element validation.");
}
