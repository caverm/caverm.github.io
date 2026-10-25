import { readFileSync } from "node:fs";
import { MAX_POST_TAGS, tagsSchema } from "../../src/utils/tags-schema.ts";
import {
	assertNoJsxRendering,
	assertZodContentBoundary,
} from "./audit-policy.mjs";
import { readAuditSources } from "./audit-sources.mjs";
export function assertBuildBoundaries() {
	const config = readFileSync("astro.config.mjs", "utf8");
	const packageData = JSON.parse(readFileSync("package.json", "utf8"));
	const sourceFiles = readAuditSources("src");
	assertNoJsxRendering({ packageData, config, sources: sourceFiles });
	assertZodContentBoundary({
		packageData,
		config,
		sources: sourceFiles,
		tagsSchema,
		maxTags: MAX_POST_TAGS,
		entryPoints: {
			build: readFileSync("scripts/build.mjs", "utf8"),
			verify: readFileSync("scripts/verify.mjs", "utf8"),
		},
	});
	if (/output:\s*["']server/.test(config) || /adapter\s*:/.test(config))
		throw new Error(
			"Audit risk review assumes static-only output without an adapter.",
		);
	if (packageData.pnpm?.overrides?.sharp !== "0.35.5")
		throw new Error(
			"Audit risk review requires patched sharp 0.35.5 override.",
		);
	if (packageData.pnpm?.overrides?.["serialize-javascript"] !== "7.1.3")
		throw new Error(
			"Audit policy requires patched serialize-javascript 7.1.3.",
		);
	const lock = readFileSync("pnpm-lock.yaml", "utf8");
	if (/sharp@0\.(?:[0-2]?[0-9]|3[0-4])\./.test(lock))
		throw new Error("Audit risk review found an older sharp in the lockfile.");
}
