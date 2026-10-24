import "./require-docker.mjs";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

async function navigateWithoutPageMotion(
	page,
	link,
	destination,
	keyboard = false,
) {
	await page.waitForFunction(() => window.swup && !window.swup.navigating);
	const previousContent = await page.locator("main").textContent();
	let releaseResponse;
	let requested;
	const responseReady = new Promise((resolve) => {
		requested = resolve;
	});
	const responseGate = new Promise((resolve) => {
		releaseResponse = resolve;
	});
	const holdResponse = async (route) => {
		requested();
		await responseGate;
		await route.continue();
	};
	const responseUrl = new URL(destination);
	responseUrl.hash = "";
	await page.route(responseUrl.href, holdResponse);
	await page.evaluate(() => {
		window.swup.cache.clear();
		const probe = { samples: [], replaced: false };
		const sample = (phase) => {
			const elements = ["main", "#sidebar", "#content-wrapper", "#toc"]
				.map((selector) => document.querySelector(selector))
				.filter(Boolean);
			probe.samples.push({
				phase,
				y: window.scrollY,
				time: performance.now(),
				visible: elements.every((element) => {
					const style = getComputedStyle(element);
					return (
						Number(style.opacity) === 1 &&
						style.visibility === "visible" &&
						style.transform === "none"
					);
				}),
				animations: elements.flatMap((element) =>
					element
						.getAnimations({ subtree: true })
						.filter((animation) => animation instanceof CSSAnimation)
						.map((animation) => animation.animationName),
				),
			});
		};
		probe.onReplace = (visit) => {
			probe.replaced = true;
			probe.replacement = { url: location.href, hash: visit.to.hash };
			sample("content:replace");
		};
		probe.onStart = (visit) => {
			probe.scrollBeforeVisit = window.scrollY;
			probe.reducedMotion = matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			probe.trigger = {
				hash: visit.to.hash,
				href: visit.trigger.el?.getAttribute("href"),
			};
		};
		window.swup.hooks.on("visit:start", probe.onStart);
		window.swup.hooks.on("content:replace", probe.onReplace);
		const frame = () => {
			sample(probe.replaced ? "new-frame" : "old-frame");
			probe.frame = requestAnimationFrame(frame);
		};
		frame();
		window.navigationMotionProbe = probe;
	});
	try {
		if (keyboard) {
			await link.focus();
			await page.keyboard.press("Enter");
		} else await link.click();
		await Promise.race([
			responseReady,
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("Navigation response was not held")),
					5000,
				),
			),
		]);
		// Exceed the former outgoing fade duration while the real response is held.
		await page.waitForTimeout(300);
		assert.equal(await page.locator("main").textContent(), previousContent);
		assert.equal(
			await page.evaluate(() =>
				window.navigationMotionProbe.samples.every((sample) => sample.visible),
			),
			true,
			"existing content stays visible while the destination response is pending",
		);
		releaseResponse();
		await page.waitForURL(new URL(destination).href);
		await page.waitForFunction(
			() => window.navigationMotionProbe.replaced && !window.swup.navigating,
		);
		await page.evaluate(
			() => new Promise((resolve) => requestAnimationFrame(resolve)),
		);
		const samples = await page.evaluate(
			() => window.navigationMotionProbe.samples,
		);
		assert(samples.some((sample) => sample.phase === "content:replace"));
		assert(samples.some((sample) => sample.phase === "new-frame"));
		assert(
			samples.every((sample) => sample.visible),
			"new content is immediately visible",
		);
		assert.deepEqual(
			[...new Set(samples.flatMap((sample) => sample.animations))],
			[],
			"navigation does not animate the page or replaced content",
		);
		assert.notEqual(await page.locator("main").textContent(), previousContent);
		const navigationStart = await page.evaluate(
			() => window.navigationMotionProbe.scrollBeforeVisit,
		);
		if (!new URL(destination).hash) {
			assert.equal(
				await page.evaluate(() => window.scrollY),
				0,
				"ordinary navigation finishes at the top",
			);
			const probe = await page.evaluate(() => ({
				start: window.navigationMotionProbe.scrollBeforeVisit,
				reduced: window.navigationMotionProbe.reducedMotion,
			}));
			if (probe.reduced)
				assert(
					!samples.some(
						(sample) =>
							sample.phase === "old-frame" &&
							sample.y > 1 &&
							sample.y < probe.start - 1,
					),
					"reduced motion does not animate the old page scroll",
				);
			if (probe.start > 1 && !probe.reduced) {
				const intermediate = samples.filter(
					(sample) =>
						sample.phase === "old-frame" &&
						sample.y > 1 &&
						sample.y < probe.start - 1,
				);
				assert(
					new Set(intermediate.map((sample) => sample.y)).size >= 3,
					"the old page scrolls smoothly before a shorter destination can clamp its height",
				);
				assert(
					samples
						.filter((sample) => sample.phase === "content:replace")
						.every((sample) => sample.y <= 1),
					"content is replaced after scrolling reaches the top",
				);
			}
		}
		assert.equal(
			await page.evaluate(() => document.activeElement === document.body),
			true,
			"Swup accessibility resets keyboard focus after navigation",
		);
		console.log(
			JSON.stringify({
				event: "navigation.motion.passed",
				path: new URL(destination).pathname,
				hash: new URL(destination).hash,
				frames: samples.length,
				pendingResponseMs: 300,
				firstReplacementVisible: true,
				intermediateScrollFrames: samples.filter(
					(sample) =>
						sample.phase === "old-frame" &&
						sample.y > 1 &&
						sample.y < navigationStart - 1,
				).length,
				replacementY: samples.find(
					(sample) => sample.phase === "content:replace",
				)?.y,
				scrollDurationMs: (() => {
					const moving = samples.find(
						(sample) =>
							sample.phase === "old-frame" && sample.y < navigationStart - 1,
					);
					const replacement = samples.find(
						(sample) => sample.phase === "content:replace",
					);
					return moving && replacement
						? Math.round(replacement.time - moving.time)
						: 0;
				})(),
				scrollBeforeVisit: await page.evaluate(
					() => window.navigationMotionProbe.scrollBeforeVisit,
				),
			}),
		);
	} catch (error) {
		console.error(
			JSON.stringify({
				event: "navigation.motion.failure",
				destination,
				probe: await page.evaluate(() => {
					const probe = window.navigationMotionProbe;
					return {
						trigger: probe?.trigger,
						replacement: probe?.replacement,
						scrollY,
					};
				}),
			}),
		);
		throw error;
	} finally {
		releaseResponse();
		await page.unrouteAll({ behavior: "wait" });
		await page.evaluate(() => {
			const probe = window.navigationMotionProbe;
			if (!probe || !window.swup) return;
			cancelAnimationFrame(probe.frame);
			window.swup.hooks.off("content:replace", probe.onReplace);
			window.swup.hooks.off("visit:start", probe.onStart);
			delete window.navigationMotionProbe;
		});
	}
}

async function checkLowerLinkScrolling(page, origin, base) {
	const home = `${origin}${base}`;
	const archive = `${origin}${base}archive/?tag=ICS`;
	for (const width of [1440, 390]) {
		await page.setViewportSize({ width, height: 1000 });
		for (const [selector, destination] of [
			[`#tags a[href="${base}archive/?tag=ICS"]`, archive],
			[
				`main a[href="${base}categories/nuclear-security/"]`,
				`${origin}${base}categories/nuclear-security/`,
			],
		]) {
			await page.goto(home, { waitUntil: "networkidle" });
			await page.evaluate(() => window.scrollTo(0, 600));
			const link = page.locator(selector).first();
			await link.scrollIntoViewIfNeeded();
			const start = await page.evaluate(() => window.scrollY);
			assert(start > 1, "the real tag/category link is clicked below the top");
			await navigateWithoutPageMotion(page, link, destination);
			const imageUrl = `${origin}${base}images/notes.svg`;
			const avatarUrl = `${origin}${base}images/avatar.svg`;
			const imagePattern = /\/images\/(?:notes|avatar)\.svg$/;
			let releaseImage;
			const imageGate = new Promise((resolve) => {
				releaseImage = resolve;
			});
			const holdImage = async (route) => {
				await imageGate;
				await route.continue();
			};
			await page.route(imagePattern, holdImage);
			const devtools = await page.context().newCDPSession(page);
			await devtools.send("Network.clearBrowserCache");
			await devtools.detach();
			const requestedImages = Promise.all([
				page.waitForRequest(imageUrl, { timeout: 5000 }),
				page.waitForRequest(avatarUrl, { timeout: 5000 }),
			]);
			const returning = page.goBack({ waitUntil: "networkidle" });
			try {
				await requestedImages;
				await page.waitForFunction(
					() => document.querySelector("main img") && !window.swup.navigating,
				);
				assert.equal(
					await page
						.locator("main img")
						.first()
						.evaluate((img) => img.complete),
					false,
				);
				const avatar = await page
					.locator("#sidebar img")
					.first()
					.evaluate((img) => {
						const box = img.closest("a").getBoundingClientRect();
						return {
							complete: img.complete,
							width: box.width,
							height: box.height,
						};
					});
				assert.equal(avatar.complete, false);
				assert(
					avatar.height > 0 && Math.abs(avatar.height - avatar.width) <= 1,
					"avatar reserves its square before image loading",
				);
				if (width === 390)
					assert.equal(
						await page
							.locator("main img")
							.first()
							.evaluate(
								(img) => img.closest("a").getBoundingClientRect().height,
							),
						200,
						"mobile cover reserves 20vh before image loading",
					);
				await page.waitForFunction(
					(expected) => Math.abs(window.scrollY - expected) <= 2,
					start,
				);
				releaseImage();
				await returning;
				await page.waitForFunction(
					() =>
						document.querySelector("main img")?.complete &&
						document.querySelector("#sidebar img")?.complete,
				);
				await page.evaluate(
					() =>
						new Promise((resolve) =>
							requestAnimationFrame(() => requestAnimationFrame(resolve)),
						),
				);
				assert(
					Math.abs((await page.evaluate(() => scrollY)) - start) <= 2,
					"history position stays restored after delayed images load",
				);
			} catch (error) {
				console.error(
					JSON.stringify({
						event: "history.lower-link.restore.failed",
						base,
						width,
						selector,
						expected: start,
						state: await page.evaluate(() => ({
							y: window.scrollY,
							height: document.documentElement.scrollHeight,
							viewportHeight: innerHeight,
							navigating: window.swup.navigating,
							restoration: history.scrollRestoration,
						})),
					}),
				);
				throw error;
			} finally {
				releaseImage();
				await returning.catch(() => {});
				await page.unroute(imagePattern, holdImage);
			}
		}
	}
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto(home, { waitUntil: "networkidle" });
	const reducedTag = page.locator(`#tags a[href="${base}archive/?tag=ICS"]`);
	await reducedTag.scrollIntoViewIfNeeded();
	await navigateWithoutPageMotion(page, reducedTag, archive, true);
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.setViewportSize({ width: 1440, height: 1000 });
}

async function checkScrollInterruptions(page, origin, base) {
	const home = `${origin}${base}`;
	const archive = `${origin}${base}archive/?tag=ICS`;
	await page.setViewportSize({ width: 390, height: 844 });
	for (const action of [
		"link",
		"back",
		"back-forward",
		"wheel",
		"back-link",
		"link-back",
		"link-back-forward",
	]) {
		await page.goto(home, { waitUntil: "networkidle" });
		const tag = page.locator(`#tags a[href="${base}archive/?tag=ICS"]`);
		await tag.scrollIntoViewIfNeeded();
		await page.evaluate(() => {
			window.scrollRaceStart = window.scrollY;
		});
		await tag.click();
		await page.waitForFunction(
			() => window.scrollY > 2 && window.scrollY < window.scrollRaceStart - 2,
		);
		let destination = archive;
		const clickPost = () =>
			page
				.locator(`main a[href="${base}posts/welcome/"]`)
				.first()
				.evaluate((link) => link.click());
		if (action === "link") {
			destination = `${origin}${base}posts/welcome/`;
			await clickPost();
		} else if (action.includes("back")) {
			if (action.startsWith("link-")) await clickPost();
			await page.evaluate(() => window.history.back());
			await page.waitForURL(home);
			destination = home;
			if (action.endsWith("forward")) {
				await page.evaluate(() => window.history.forward());
				destination = archive;
			} else if (action === "back-link") {
				await clickPost();
				destination = `${origin}${base}posts/welcome/`;
			}
		} else await page.mouse.wheel(0, 120);
		await page.waitForURL(destination);
		await page.waitForFunction(() => !window.swup.navigating);
		if (destination.endsWith("posts/welcome/"))
			assert.match(
				await page.locator("main h1").innerText(),
				/보안과 컴퓨터공학/,
			);
		else if (destination === home)
			await page.locator('main a[aria-label="Page 2"]').waitFor();
		else {
			await page
				.locator(`main a[href="${base}posts/ot-ics-learning/"]`)
				.waitFor();
			assert.equal(await page.locator('main a[href*="/posts/"]').count(), 1);
		}
		if (destination === home)
			await page.waitForFunction(
				() => Math.abs(window.scrollY - window.scrollRaceStart) <= 2,
			);
		else await page.waitForFunction(() => window.scrollY === 0);
		if (action.endsWith("forward")) {
			const index = await page.evaluate(() => history.state.index);
			await page
				.locator(`a[href="${base}posts/ot-ics-learning/"]`)
				.first()
				.click();
			await page.waitForURL(`${origin}${base}posts/ot-ics-learning/`);
			await page.waitForFunction(() => !window.swup.navigating);
			assert.equal(await page.evaluate(() => history.state.index), index + 1);
			await page.evaluate(() => history.back());
			await page.waitForURL(archive);
			await page.waitForFunction(() => !window.swup.navigating);
			assert.equal(await page.locator('main a[href*="/posts/"]').count(), 1);
			assert.equal(await page.evaluate(() => history.state.index), index);
			await page.evaluate(() => history.forward());
			await page.waitForURL(`${origin}${base}posts/ot-ics-learning/`);
			await page.waitForFunction(() => !window.swup.navigating);
			await page.locator("main h1").filter({ hasText: "OT·ICS" }).waitFor();
			assert.equal(await page.evaluate(() => history.state.index), index + 1);
		}
		assert.equal(
			await page.evaluate(() =>
				["main", "#sidebar", "#content-wrapper"].every(
					(selector) =>
						getComputedStyle(document.querySelector(selector)).opacity === "1",
				),
			),
			true,
		);
		console.log(
			JSON.stringify({
				event: "navigation.scroll.interruption.passed",
				base,
				action,
			}),
		);
	}
	await page.setViewportSize({ width: 1440, height: 1000 });
}

async function settleForScreenshot(page) {
	const footer = page.locator(".footer:visible").first();
	await footer.scrollIntoViewIfNeeded();
	await page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			),
	);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForFunction(
		() =>
			!document.documentElement.classList.contains("is-changing") &&
			!document.documentElement.classList.contains("is-animating"),
	);
	await page.evaluate(async () => {
		await document.fonts.ready;
		await Promise.all(
			document
				.getAnimations()
				.filter(
					(animation) =>
						animation.effect?.getComputedTiming().iterations !==
						Number.POSITIVE_INFINITY,
				)
				.map((animation) => animation.finished.catch(() => {})),
		);
		for (const id of [
			"search-panel",
			"nav-menu-panel",
			"display-setting",
			"light-dark-panel",
		])
			document.getElementById(id)?.classList.add("float-panel-closed");
	});
	await page.waitForFunction(() => {
		return ["#sidebar", "category-navigation"].every((selector) => {
			const element = document.querySelector(selector);
			return (
				element &&
				element.getBoundingClientRect().height > 0 &&
				Number(getComputedStyle(element).opacity) >= 0.99
			);
		});
	});
	assert.equal(
		await page.locator("category-navigation nav").isVisible(),
		true,
		"settled category tree is visible",
	);
	assert.equal(
		await page
			.locator(".footer")
			.evaluateAll((elements) =>
				elements.some(
					(element) =>
						element.getBoundingClientRect().height > 0 &&
						Number(getComputedStyle(element).opacity) >= 0.99,
				),
			),
		true,
		"settled footer is visible",
	);
}
mkdirSync("artifacts/screenshots", { recursive: true });
const browser = await chromium.launch({
	headless: true,
	args: ["--no-sandbox"],
});
try {
	for (const [directory, base] of [
		["dist-root", "/"],
		["dist", "/blog/"],
	]) {
		const root = path.resolve(directory);
		const server = createServer((request, response) => {
			const pathname = decodeURIComponent(
				new URL(request.url, "http://localhost").pathname,
			);
			if (!pathname.startsWith(base)) {
				response.writeHead(404).end();
				return;
			}
			let target = path.resolve(root, pathname.slice(base.length));
			if (!target.startsWith(`${root}/`) && target !== root) {
				response.writeHead(403).end();
				return;
			}
			if (existsSync(target) && statSync(target).isDirectory())
				target = path.join(target, "index.html");
			if (!existsSync(target)) {
				response.writeHead(404).end("Not found");
				return;
			}
			const mime = {
				".html": "text/html",
				".js": "text/javascript",
				".css": "text/css",
				".svg": "image/svg+xml",
				".xml": "application/xml",
				".json": "application/json",
				".wasm": "application/wasm",
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
		const context = await browser.newContext({
			viewport: { width: 1440, height: 1000 },
			permissions: ["clipboard-read", "clipboard-write"],
		});
		const page = await context.newPage();
		const errors = [];
		const failedRequests = [];
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("response", (response) => {
			if (response.status() >= 400)
				failedRequests.push(`${response.status()} ${response.url()}`);
		});
		try {
			await checkLowerLinkScrolling(page, origin, base);
			await checkScrollInterruptions(page, origin, base);
			await page.goto(`${origin}${base}`, { waitUntil: "networkidle" });
			await page.locator("#search-bar input").waitFor();
			assert.equal(
				(await page.locator('main a[href*="/posts/"]').count()) > 0,
				true,
			);
			await navigateWithoutPageMotion(
				page,
				page.locator('a[aria-label="Page 2"]'),
				`${origin}${base}2/`,
				true,
			);
			await page.goto(`${origin}${base}categories/security/`, {
				waitUntil: "networkidle",
			});
			assert.match(await page.locator("main").innerText(), /7개의 글/);
			const devToggle = page.locator(
				'[aria-controls="category-children-security"]',
			);
			assert.equal(await devToggle.getAttribute("aria-expanded"), "true");
			await devToggle.focus();
			await page.keyboard.press("Space");
			assert.equal(
				await page.locator("#category-children-security").isVisible(),
				false,
			);
			await page.keyboard.press("Enter");
			assert.equal(
				await page.locator("#category-children-security").isVisible(),
				true,
			);
			await page.evaluate(() => window.scrollTo(0, 400));
			const categoryScroll = await page.evaluate(() => window.scrollY);
			await navigateWithoutPageMotion(
				page,
				page.locator('[data-category-id="web-hacking"]'),
				`${origin}${base}categories/web-hacking/`,
			);
			await page
				.locator('[data-category-id="web-hacking"][aria-current="page"]')
				.waitFor();
			assert.equal(
				await page
					.locator('[aria-controls="category-children-security"]')
					.getAttribute("aria-expanded"),
				"true",
			);
			await page.goBack({ waitUntil: "networkidle" });
			await page
				.locator('[data-category-id="security"][aria-current="page"]')
				.waitFor();
			await page.waitForFunction(
				(expected) => Math.abs(window.scrollY - expected) <= 2,
				categoryScroll,
			);
			console.log(
				JSON.stringify({
					event: "history.restore.passed",
					expected: categoryScroll,
					actual: await page.evaluate(() => window.scrollY),
				}),
			);
			await page.goto(`${origin}${base}categories/empty/`, {
				waitUntil: "networkidle",
			});
			assert.match(await page.locator("main").innerText(), /0개의 글/);
			await page.goto(`${origin}${base}`, { waitUntil: "networkidle" });
			await navigateWithoutPageMotion(
				page,
				page.locator(`main a[href="${base}posts/deep-code/"]`).first(),
				`${origin}${base}posts/deep-code/`,
			);
			assert.equal(
				await page.locator('[aria-label="카테고리 경로"] a').count(),
				6,
			);
			assert.equal(
				await page
					.locator('[data-category-id="security-notes"][aria-current="page"]')
					.count(),
				1,
			);
			await page.locator(".copy-btn").click();
			await page.waitForFunction(() =>
				document.querySelector(".copy-btn")?.classList.contains("success"),
			);
			assert.match(
				await page.evaluate(() => navigator.clipboard.readText()),
				/syntheticLearningNote/,
			);
			const toc = page.locator('#toc a[href^="#"]').first();
			assert.equal(await toc.count(), 1);
			await page.setViewportSize({ width: 1800, height: 1100 });
			await toc.click();
			await page.waitForFunction(() => window.location.hash.length > 1);
			await page.waitForFunction(() => {
				const heading = document.getElementById(
					decodeURIComponent(window.location.hash.slice(1)),
				);
				const rect = heading?.getBoundingClientRect();
				return rect && rect.top >= 0 && rect.top < window.innerHeight;
			});
			await page.waitForFunction(
				() => document.querySelectorAll("#toc .visible").length > 0,
			);
			const crossPageHash = await toc.getAttribute("href");
			await page.goto(`${origin}${base}`, { waitUntil: "networkidle" });
			const hashLink = page
				.locator(`main a[href^="${base}posts/deep-code/"]`)
				.first();
			await hashLink.evaluate((link, hash) => {
				link.hash = hash;
				link.dataset.motionHashLink = "true";
			}, crossPageHash);
			const stableHashLink = page.locator('[data-motion-hash-link="true"]');
			await navigateWithoutPageMotion(
				page,
				stableHashLink,
				`${origin}${base}posts/deep-code/${crossPageHash}`,
				true,
			);
			await page.waitForFunction(() => {
				const heading = document.getElementById(
					decodeURIComponent(window.location.hash.slice(1)),
				);
				const rect = heading?.getBoundingClientRect();
				return rect && rect.top >= 0 && rect.top < window.innerHeight;
			});
			await page.setViewportSize({ width: 1440, height: 1000 });
			await page.locator("#scheme-switch").click();
			await page.waitForTimeout(150);
			assert.equal(
				await page.evaluate(() =>
					["light", "dark", "auto"].includes(localStorage.getItem("theme")),
				),
				true,
			);
			// Query the real built Pagefind through the original search UI.
			await page.locator("#search-bar input").fill("긴 코드");
			await page
				.locator('#search-panel a[href*="/posts/deep-code/"]')
				.waitFor();
			const resultUrl = await page
				.locator('#search-panel a[href*="/posts/deep-code/"]')
				.first()
				.getAttribute("href");
			assert(new URL(resultUrl, origin).pathname.startsWith(base));
			await page.locator("#search-bar input").fill("");
			await page.waitForFunction(
				() => document.querySelectorAll("#search-panel a").length === 0,
			);
			await page.locator("#search-bar input").fill("DRAFT_PRIVATE_CANARY_7F3");
			await page
				.locator("#search-panel [role=status]")
				.filter({ hasText: /개의 글을 찾았습니다\.|검색 결과가 없습니다\./ })
				.waitFor();
			assert.equal(
				await page.locator('#search-panel a[href*="draft-private"]').count(),
				0,
			);
			// Pagefind tokenizes the underscore canary and can match the public
			// CMS example's "draft" code token. Use the draft-only Korean token
			// for the zero-result assertion; exact canaries are also scanned in dist.
			await page.locator("#search-bar input").fill("비공개초안표식");
			await page
				.locator("#search-panel [role=status]")
				.filter({ hasText: "검색 결과가 없습니다." })
				.waitFor();
			assert.equal(
				await page.locator('#search-panel a[href*="draft-private"]').count(),
				0,
			);
			const response = await context.request.get(
				`${origin}${base}posts/draft-private-canary-7f3/`,
			);
			assert.equal(response.status(), 404);
			await page.goto(
				`${origin}${base}archive/?tag=${encodeURIComponent("운영체제")}`,
				{ waitUntil: "networkidle" },
			);
			await page.locator('main a[href*="/posts/reading-notes/"]').waitFor();
			assert.equal(await page.locator('main a[href*="/posts/"]').count(), 1);
			const expectedAbout = await page.evaluate(
				(html) => {
					const document = new DOMParser().parseFromString(html, "text/html");
					const bodies = document.querySelectorAll("main [data-pagefind-body]");
					return bodies.length === 1
						? (bodies[0].textContent || "").replace(/\s+/g, " ").trim()
						: "";
				},
				readFileSync(path.join(directory, "about/index.html"), "utf8"),
			);
			assert(
				expectedAbout.length > 0,
				"Built about page has a nonempty Markdown body",
			);
			await navigateWithoutPageMotion(
				page,
				page.locator(`#navbar a[href="${base}about/"]`).first(),
				`${origin}${base}about/`,
			);
			const aboutBody = page.locator("main [data-pagefind-body]");
			assert.equal(
				await aboutBody.count(),
				1,
				"About page has one Markdown body",
			);
			assert(await aboutBody.isVisible(), "About body is visible");
			const actualAbout = ((await aboutBody.textContent()) || "")
				.replace(/\s+/g, " ")
				.trim();
			assert(
				actualAbout === expectedAbout,
				"About body matches the built content",
			);
			if (base !== "/") {
				await page.goto(`${origin}${base}`, { waitUntil: "networkidle" });
				await page.evaluate(() => {
					localStorage.setItem("theme", "light");
					document.documentElement.classList.remove("dark");
				});
				await settleForScreenshot(page);
				await page.screenshot({
					path: "artifacts/screenshots/desktop-light.png",
					fullPage: true,
				});
				await page.evaluate(() => {
					localStorage.setItem("theme", "dark");
					document.documentElement.classList.add("dark");
				});
				await settleForScreenshot(page);
				await page.screenshot({
					path: "artifacts/screenshots/desktop-dark.png",
					fullPage: true,
				});
			}
			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto(`${origin}${base}posts/deep-code/`, {
				waitUntil: "networkidle",
			});
			assert.equal(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1,
				),
				true,
				"mobile page overflow",
			);
			assert.equal(
				await page
					.locator("pre")
					.evaluate((element) => element.scrollWidth > element.clientWidth),
				true,
				"long code should scroll inside its block",
			);
			await page.locator("#nav-menu-switch").click();
			await page
				.locator('#nav-menu-panel a[href$="/categories/"]')
				.waitFor({ state: "visible" });
			await navigateWithoutPageMotion(
				page,
				page.locator('#nav-menu-panel a[href$="/categories/"]'),
				`${origin}${base}categories/`,
			);
			await page
				.locator('[data-category-id="ctf-notes"]')
				.waitFor({ state: "attached" });
			const lifeToggle = page.locator(
				'[aria-controls="category-children-ctf"]',
			);
			if ((await lifeToggle.getAttribute("aria-expanded")) === "false")
				await lifeToggle.click();
			const ctfWebToggle = page.locator(
				'[aria-controls="category-children-ctf-web"]',
			);
			if ((await ctfWebToggle.getAttribute("aria-expanded")) === "false")
				await ctfWebToggle.click();
			await navigateWithoutPageMotion(
				page,
				page.locator('[data-category-id="ctf-notes"]'),
				`${origin}${base}categories/ctf-notes/`,
			);
			await page
				.locator('[data-category-id="ctf-notes"][aria-current="page"]')
				.waitFor();
			if (base !== "/") {
				await settleForScreenshot(page);
				await page.screenshot({
					path: "artifacts/screenshots/mobile-category.png",
					fullPage: true,
				});
				await page.goto(`${origin}${base}posts/deep-code/`, {
					waitUntil: "networkidle",
				});
				await settleForScreenshot(page);
				await page.screenshot({
					path: "artifacts/screenshots/mobile-post.png",
					fullPage: true,
				});
			}
			assert.deepEqual(errors, [], "browser exceptions");
			assert.deepEqual(failedRequests, [], "failed assets/search requests");
			console.log(
				`Browser checks passed: ${directory}, ${base}, desktop/mobile, Swup, keyboard, search, copy, theme.`,
			);
		} catch (error) {
			console.error(
				JSON.stringify({
					event: "browser.failure",
					base,
					url: page.url(),
					searchStatus: await page
						.locator("#search-panel [role=status]")
						.textContent(),
					searchResults: await page
						.locator("#search-panel a")
						.evaluateAll((links) =>
							links.map((link) => link.getAttribute("href")),
						),
					errors,
					failedRequests,
				}),
			);
			throw error;
		} finally {
			await context.close();
			await new Promise((resolve) => server.close(resolve));
		}
	}
} finally {
	await browser.close();
}
