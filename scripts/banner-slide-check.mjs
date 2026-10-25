import "./require-docker.mjs";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

const baselineOnly = process.argv.includes("--baseline");
const rapidOnly = process.argv.includes("--rapid-only");
const selectors = ["#banner-wrapper", "#banner", "#main-grid", "#top-row"];
const routes = ["", "categories/nuclear-security/", "archive/", "about/"];
const root = path.resolve("dist");
const server = createServer((request, response) => {
	let target = path.resolve(
		root,
		`.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`,
	);
	if (target !== root && !target.startsWith(`${root}/`))
		return response.writeHead(403).end();
	if (existsSync(target) && statSync(target).isDirectory())
		target = path.join(target, "index.html");
	if (!existsSync(target)) return response.writeHead(404).end();
	const mime = {
		".html": "text/html",
		".css": "text/css",
		".js": "text/javascript",
		".wasm": "application/wasm",
		".json": "application/json",
		".svg": "image/svg+xml",
		".woff2": "font/woff2",
	};
	response.setHeader(
		"Content-Type",
		mime[path.extname(target)] || "application/octet-stream",
	);
	response.end(readFileSync(target));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
	headless: true,
	args: ["--no-sandbox"],
});
const context = await browser.newContext({
	viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function geometry() {
	return page.evaluate(
		(selectors) =>
			Object.fromEntries(
				selectors.map((selector) => {
					const element = document.querySelector(selector);
					const rect = element.getBoundingClientRect();
					const style = getComputedStyle(element);
					return [
						selector,
						{
							top: rect.top + scrollY,
							height: rect.height,
							transform: style.transform,
						},
					];
				}),
			),
		selectors,
	);
}
async function direct(route) {
	await page.goto(`${origin}/${route}`, { waitUntil: "networkidle" });
	await page.waitForFunction(() => window.swup && !window.swup.navigating);
	await page.evaluate(() => scrollTo(0, 0));
	return geometry();
}
function compare(actual, expected) {
	for (const selector of selectors) {
		for (const key of ["top", "height"]) {
			if (selector === "#main-grid" && key === "height") continue;
			assert(
				Math.abs(actual[selector][key] - expected[selector][key]) <= 1,
				`${selector} ${key}: ${actual[selector][key]} vs ${expected[selector][key]}`,
			);
		}
		assert.equal(
			actual[selector].transform,
			expected[selector].transform,
			`${selector} final transform`,
		);
	}
}
try {
	if (baselineOnly) {
		const baseline = {};
		for (const width of [1440, 390]) {
			await page.setViewportSize({ width, height: 1000 });
			for (const route of routes)
				baseline[`${width}:${route}`] = await direct(route);
		}
		writeFileSync(
			"artifacts/banner-slide-baseline.json",
			JSON.stringify(baseline, null, 2),
		);
		console.log(
			"Saved existing direct URL geometry without changing final layout values.",
		);
	} else {
		const baseline = JSON.parse(
			readFileSync("artifacts/banner-slide-baseline.json", "utf8"),
		);
		for (const width of rapidOnly ? [] : [1440, 390]) {
			await page.setViewportSize({ width, height: 1000 });
			for (const route of routes)
				compare(await direct(route), baseline[`${width}:${route}`]);
			for (const reduced of [false, true]) {
				await page.emulateMedia({
					reducedMotion: reduced ? "reduce" : "no-preference",
				});
				for (const route of routes.slice(1)) {
					for (const [from, to] of [
						["", route],
						[route, ""],
					]) {
						await direct(from);
						await page.evaluate(
							({ selectors, to }) => {
								const probe = { samples: [], replaced: false };
								const oldMain = document.querySelector("main");
								const frame = () => {
									if (
										!probe.replaced &&
										document.querySelector("main") !== oldMain
									) {
										probe.replaced = true;
										probe.at = performance.now();
									}
									probe.samples.push({
										replaced: probe.replaced,
										time: performance.now(),
										values: selectors
											.slice(0, 3)
											.map(
												(selector) =>
													new DOMMatrixReadOnly(
														getComputedStyle(document.querySelector(selector))
															.transform,
													).m42,
											),
										opacity: getComputedStyle(
											document.querySelector("#sidebar"),
										).opacity,
									});
									probe.raf = requestAnimationFrame(frame);
								};
								frame();
								window.bannerProbe = probe;
								const link = document.createElement("a");
								link.href = `/${to}`;
								document.querySelector("main").append(link);
								link.click();
							},
							{ selectors, to },
						);
						await page.waitForURL(`${origin}/${to}`);
						await page.waitForFunction(
							() => window.bannerProbe.replaced && !window.swup.navigating,
						);
						const probe = await page.evaluate(() => {
							cancelAnimationFrame(window.bannerProbe.raf);
							return window.bannerProbe;
						});
						const before = baseline[`${width}:${from}`];
						const after = baseline[`${width}:${to}`];
						for (const [index, selector] of selectors.slice(0, 3).entries()) {
							const m42 = (matrix) =>
								matrix === "none"
									? 0
									: Number(matrix.slice(7, -1).split(",")[5]);
							const start = m42(before[selector].transform);
							const end = m42(after[selector].transform);
							const intermediate = probe.samples.filter(
								(sample) =>
									sample.replaced &&
									sample.values[index] > Math.min(start, end) + 0.1 &&
									sample.values[index] < Math.max(start, end) - 0.1,
							);
							assert.equal(
								intermediate.length > 0,
								width >= 1024 && !reduced && start !== end,
								`${selector} intermediate frames width=${width} reduced=${reduced}`,
							);
						}
						assert(
							probe.samples.every((sample) => sample.opacity === "1"),
							"sidebar remains opaque during layout movement",
						);
						compare(await geometry(), baseline[`${width}:${to}`]);
						console.log(
							JSON.stringify({
								event: "banner.slide.passed",
								width,
								reduced,
								from,
								to,
								frames: probe.samples.length,
								duration: Math.round(
									performance.now ? probe.samples.at(-1).time - probe.at : 0,
								),
							}),
						);
					}
				}
			}
		}
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.emulateMedia({ reducedMotion: "no-preference" });
		for (const [from, to] of [
			["", "archive/"],
			["archive/", ""],
		]) {
			for (const action of ["link", "back-forward"]) {
				await direct(from);
				await page.evaluate((to) => {
					const link = document.createElement("a");
					link.href = `/${to}`;
					document.querySelector("main").append(link);
					link.click();
				}, to);
				await page.waitForFunction(() =>
					document.body.hasAttribute("data-banner-motion"),
				);
				await page.waitForTimeout(350);
				assert(
					await page.evaluate(() =>
						document
							.querySelector("#main-grid")
							.getAnimations()
							.some(
								(animation) =>
									animation instanceof CSSTransition &&
									animation.playState === "running",
							),
					),
					"layout is still moving after the main transition finishes",
				);
				assert.equal(
					await page
						.locator("main")
						.evaluate((main) => main.getAnimations().length),
					0,
					"main incoming has finished before this later input",
				);
				if (action === "link") {
					await page.evaluate(() =>
						document.querySelector('a[href="/about/"]').click(),
					);
					await page.waitForTimeout(60);
					assert.equal(
						page.url(),
						`${origin}/${to}`,
						"later link stays buffered while layout transition runs",
					);
					await page.waitForURL(`${origin}/about/`);
				} else {
					await page.evaluate(() => history.back());
					await page.waitForURL(`${origin}/${from}`);
					await page.evaluate(() => history.forward());
					await page.waitForURL(`${origin}/${to}`);
				}
				await page.waitForFunction(() => !window.swup.navigating);
				compare(
					await geometry(),
					baseline[`1440:${action === "link" ? "about/" : to}`],
				);
				console.log(
					JSON.stringify({
						event: "banner.slide.late-input.passed",
						from,
						to,
						action,
						inputAfterMs: 350,
					}),
				);
			}
		}
		assert.deepEqual(errors, []);
		console.log(
			"Banner slide final geometry, desktop/mobile, reduced motion and sidebar visibility passed.",
		);
	}
} finally {
	await context.close();
	await browser.close();
	await new Promise((resolve) => server.close(resolve));
}
