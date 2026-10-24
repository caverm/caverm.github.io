import "./require-docker.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { assertNoJsxRendering } from "./lib/audit-policy.mjs";

const result = spawnSync("pnpm", ["audit", "--prod", "--json"], {
	encoding: "utf8",
	maxBuffer: 16 * 1024 * 1024,
});
if (result.error) throw result.error;
let report;
try {
	report = JSON.parse(result.stdout);
} catch {
	throw new Error(
		`Dependency audit did not return valid JSON (exit ${result.status}).`,
	);
}
if (!report.advisories || !report.metadata?.vulnerabilities)
	throw new Error(
		"Dependency audit response is incomplete; registry failure is not a pass.",
	);
const accepted = new Set([
	"GHSA-j687-52p2-xcff",
	"GHSA-jrpj-wcv7-9fh9",
	"GHSA-f48w-9m4c-m7f5",
	"GHSA-4g3v-8h47-v7g6",
	"GHSA-376h-93r7-7g6f",
	"GHSA-xr5h-phrj-8vxv",
	"GHSA-7pw4-f3q4-r2p2",
	"GHSA-2pvr-wf23-7pc7",
	"GHSA-8hv8-536x-4wqp",
	"GHSA-26w7-cxv4-gfx2",
	"GHSA-vfj7-8cjw-p6xm",
	"GHSA-g7r4-m6w7-qqqr",
	"GHSA-238p-pmpm-9mq7",
	"GHSA-rj75-hqrm-r3gf",
	"GHSA-98hj-9722-w3j8",
]);
const config = readFileSync("astro.config.mjs", "utf8");
const packageData = JSON.parse(readFileSync("package.json", "utf8"));
function sources(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = `${directory}/${entry.name}`;
		return entry.isDirectory()
			? sources(path)
			: [
					{
						path,
						content: /\.(?:mdx|jsx|tsx|js|mjs|ts|astro|svelte|md)$/.test(path)
							? readFileSync(path, "utf8")
							: "",
					},
				];
	});
}
assertNoJsxRendering({ packageData, config, sources: sources("src") });
if (/output:\s*["']server/.test(config) || /adapter\s*:/.test(config))
	throw new Error(
		"Audit risk review assumes static-only output without an adapter.",
	);
if (packageData.pnpm?.overrides?.sharp !== "0.35.5")
	throw new Error("Audit risk review requires patched sharp 0.35.5 override.");
const lock = readFileSync("pnpm-lock.yaml", "utf8");
if (/sharp@0\.(?:[0-2]?[0-9]|3[0-4])\./.test(lock))
	throw new Error("Audit risk review found an older sharp in the lockfile.");
const records = Object.values(report.advisories).map((advisory) => ({
	id: advisory.github_advisory_id || advisory.url?.split("/").at(-1),
	module: advisory.module_name,
	severity: advisory.severity,
	url: advisory.url,
}));
const unknown = records.filter((item) => !accepted.has(item.id));
mkdirSync("artifacts", { recursive: true });
writeFileSync(
	"artifacts/dependency-audit.json",
	JSON.stringify(report, null, 2),
);
writeFileSync(
	"artifacts/dependency-audit-summary.json",
	JSON.stringify(
		{
			checkedAt: new Date().toISOString(),
			rawAuditExitCode: result.status,
			counts: report.metadata.vulnerabilities,
			knownRisks: records,
			unknown,
		},
		null,
		2,
	),
);
console.log(
	JSON.stringify({
		level: records.length ? "WARN" : "INFO",
		event: "dependency.audit",
		rawAuditExitCode: result.status,
		counts: report.metadata.vulnerabilities,
		knownRiskCount: records.length - unknown.length,
		unknownRiskCount: unknown.length,
		policy: "docs/security-spec.md",
	}),
);
if (unknown.length) {
	console.error(JSON.stringify(unknown));
	process.exit(1);
}
if (result.status !== 0 && result.status !== 1)
	throw new Error(`Audit command failed: ${result.status}`);
if (records.length)
	console.log(
		"Known dependency advisories remain. They are explicitly bounded and recorded; this is not a clean dependency audit. See docs/security-spec.md.",
	);
