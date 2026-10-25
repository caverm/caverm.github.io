import "./security.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { assertBuildBoundaries as checkPolicy } from "./lib/build-boundaries.mjs";

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
	"GHSA-mrhx-c7xc-m3w5",
]);
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
const checkedAt = new Date().toISOString();
function saveSummary(policyStatus, policyError) {
	writeFileSync(
		"artifacts/dependency-audit-summary.json",
		JSON.stringify(
			{
				checkedAt,
				policyStatus,
				policyError,
				rawAuditExitCode: result.status,
				counts: report.metadata.vulnerabilities,
				knownRisks: records,
				unknown,
			},
			null,
			2,
		),
	);
}
saveSummary("pending");
try {
	if (result.status !== 0 && result.status !== 1)
		throw new Error(`Audit command failed: ${result.status}`);
	checkPolicy();
} catch (error) {
	saveSummary("failed", error instanceof Error ? error.message : String(error));
	throw error;
}
saveSummary(unknown.length ? "failed" : "passed");
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
if (records.length)
	console.log(
		"Known dependency advisories remain. They are explicitly bounded and recorded; this is not a clean dependency audit. See docs/security-spec.md.",
	);
