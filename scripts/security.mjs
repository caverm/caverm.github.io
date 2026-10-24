import "./require-docker.mjs";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function files(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
		item.isDirectory()
			? files(path.join(dir, item.name))
			: [path.join(dir, item.name)],
	);
}
let count = 0;
for (const file of [...files("src"), ...files("public")]) {
	const bytes = readFileSync(file);
	const header = bytes.subarray(0, 96).toString("latin1");
	if (
		(bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
			/avif|avis/.test(header)) ||
		/\.avif$/i.test(file)
	)
		throw new Error(
			`SEC-ASSET-01: AVIF is not accepted by this trusted-content build: ${file}`,
		);
	if (/\.(?:ts|js|mjs|astro|svelte|md|json|svg|txt)$/.test(file)) {
		const text = bytes.toString();
		if (
			/(?:gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(
				text,
			)
		)
			throw new Error(`SEC-SECRET-01: possible secret in ${file}`);
	}
	count++;
}
console.log(
	`Source security checks passed: ${count} files; trusted repository assets only.`,
);
