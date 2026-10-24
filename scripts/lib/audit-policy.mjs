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
