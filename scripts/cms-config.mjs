import "./require-docker.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { checkCmsConfig, renderCmsConfig } from "./lib/cms.mjs";

const definitions = JSON.parse(
	readFileSync("src/data/categories.json", "utf8"),
);
if (process.argv.includes("--check")) {
	checkCmsConfig(readFileSync(".pages.yml", "utf8"), definitions);
	console.log("CMS configuration matches the single category source.");
} else {
	writeFileSync(".pages.yml", renderCmsConfig(definitions));
	console.log("Generated .pages.yml from the single category source.");
}
