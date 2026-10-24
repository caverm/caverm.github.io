import "./require-docker.mjs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const jobId = randomUUID();
const started = Date.now();
function log(level, event, fields = {}) {
	console.log(
		JSON.stringify({
			time: new Date().toISOString(),
			level,
			event,
			module: "verify",
			jobId,
			...fields,
		}),
	);
}
function step(name, args, env = {}) {
	const start = Date.now();
	log("INFO", "step.start", { name, command: ["pnpm", ...args].join(" ") });
	const result = spawnSync("pnpm", args, {
		stdio: "inherit",
		env: { ...process.env, ...env },
	});
	const exitCode = result.status ?? 1;
	log(exitCode === 0 ? "INFO" : "ERROR", "step.end", {
		name,
		exitCode,
		durationMs: Date.now() - start,
	});
	if (exitCode !== 0 || result.error) {
		log("ERROR", "verify.end", {
			result: "failed",
			durationMs: Date.now() - started,
		});
		process.exit(exitCode || 1);
	}
}
log("INFO", "verify.start");
step("format-lint", ["lint"]);
step("cms-config", ["cms:check"]);
step("astro-types-content", ["check"]);
step("unit", ["test:unit"]);
step("source-security", ["security"]);
step("root-build", ["build"], { BASE_PATH: "/", BUILD_OUT_DIR: "dist-root" });
step("root-artifacts", [
	"exec",
	"node",
	"scripts/check-dist.mjs",
	"dist-root",
	"/",
]);
step("project-build", ["build"], {
	BASE_PATH: "/blog/",
	BUILD_OUT_DIR: "dist",
});
step("project-artifacts", [
	"exec",
	"node",
	"scripts/check-dist.mjs",
	"dist",
	"/blog/",
]);
step("collision-build", ["build"], {
	BASE_PATH: "/posts/",
	BUILD_OUT_DIR: "dist-collision",
});
step("collision-artifacts", [
	"exec",
	"node",
	"scripts/check-dist.mjs",
	"dist-collision",
	"/posts/",
]);
step("browser", ["test:browser"]);
log("INFO", "verify.end", {
	result: "passed",
	durationMs: Date.now() - started,
});
