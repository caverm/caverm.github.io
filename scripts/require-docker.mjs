import { existsSync } from "node:fs";

if (process.platform !== "linux" || !existsSync("/.dockerenv")) {
	console.error(
		"이 프로젝트의 Node/pnpm 명령은 Docker Linux 안에서 실행하세요. README의 docker compose 명령을 사용하세요.",
	);
	process.exit(1);
}
