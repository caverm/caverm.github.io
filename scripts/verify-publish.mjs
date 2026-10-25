import "./require-docker.mjs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const jobId = randomUUID();
const started = Date.now();
const base = process.env.BASE_PATH || "/";
function log(level, event, fields = {}) {
	console.log(
		JSON.stringify({
			time: new Date().toISOString(),
			level,
			module: "verify-publish",
			event,
			jobId,
			...fields,
		}),
	);
}
log("INFO", "publish.verify.start");
for (const args of [
	["build"],
	["exec", "node", "scripts/check-dist.mjs", "dist", base, "--publish"],
]) {
	const stepStart = Date.now();
	log("INFO", "publish.step.start", { command: ["pnpm", ...args].join(" ") });
	const result = spawnSync("pnpm", args, {
		stdio: "inherit",
		env: { ...process.env, BUILD_OUT_DIR: "dist" },
	});
	const exitCode = result.status ?? 1;
	log(exitCode === 0 ? "INFO" : "ERROR", "publish.step.end", {
		command: ["pnpm", ...args].join(" "),
		exitCode,
		durationMs: Date.now() - stepStart,
	});
	if (result.error || exitCode !== 0) {
		log("ERROR", "publish.verify.end", {
			result: "failed",
			durationMs: Date.now() - started,
		});
		process.exit(exitCode || 1);
	}
}
log("INFO", "publish.verify.end", {
	result: "passed",
	durationMs: Date.now() - started,
});
