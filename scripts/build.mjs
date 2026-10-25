import "./require-docker.mjs";
import "./security.mjs";
import { spawnSync } from "node:child_process";

const target = process.env.BUILD_OUT_DIR || "dist";
for (const args of [
	[
		"exec",
		"node",
		"--experimental-strip-types",
		"scripts/check-build-boundaries.mjs",
	],
	["cms:check"],
	["exec", "astro", "build"],
	["exec", "pagefind", "--site", target],
]) {
	const result = spawnSync("pnpm", args, {
		stdio: "inherit",
		env: process.env,
	});
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}
