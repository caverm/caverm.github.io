import "./require-docker.mjs";
import fs from "node:fs";
import path from "node:path";

const [slug, categoryId = "projects"] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
	console.error(
		"사용법: docker compose run --rm blog pnpm new-post <ascii-slug> [category-id]",
	);
	process.exit(1);
}
const categories = JSON.parse(
	fs.readFileSync("src/data/categories.json", "utf8"),
);
if (!categories.some((category) => category.id === categoryId))
	throw new Error(`없는 categoryId: ${categoryId}`);
const target = path.join("src/content/posts", `${slug}.md`);
const content = `---\nslug: ${slug}\ntitle: '제목을 입력하세요'\npublished: ${new Date().toISOString().slice(0, 10)}\ndescription: '글 설명을 입력하세요'\nimage: ''\ntags: []\ncategoryId: ${categoryId}\ndraft: true\nlang: ko\n---\n\n첫 문장을 적어 보세요.\n`;
fs.writeFileSync(target, content, { flag: "wx" });
console.log(`합성 자리표시자로 초안을 만들었습니다: ${target}`);
