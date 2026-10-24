import "./require-docker.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { validateCmsPayload } from "./lib/cms.mjs";

let input;
try {
	input = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
		?.inputs?.payload;
} catch {
	// Event parse/read errors must not include the event body or account context.
	throw new Error("CMS_ACTION_EVENT_UNREADABLE");
}
const action = validateCmsPayload(input, {
	repository: process.env.GITHUB_REPOSITORY,
	ref: process.env.GITHUB_REF,
});
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/cms-action-output.txt", `action=${action}\n`);
console.log(
	JSON.stringify({
		time: new Date().toISOString(),
		level: "INFO",
		module: "cms-action",
		event: "action.validated",
		action,
		jobId: process.env.GITHUB_RUN_ID || "local",
	}),
);
