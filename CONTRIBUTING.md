# 기여와 검증

프로젝트 작업 규칙은 `AGENTS.md`가 기준이고 실제 실행·개인화 방법은 `README.md`를 따릅니다. 새로운 기능은 `specs/<feature>/`의 기능 명세·계획·작업 기록과 함께 구현합니다.

모든 Node/pnpm 명령은 Docker Linux에서 실행합니다.

```powershell
docker compose run --rm blog pnpm format
docker compose run --rm blog pnpm verify
```

요청과 관련된 작은 변경을 만들고, 실행한 검사와 실패·미실행 항목을 기록합니다. 원시 의존성 audit의 알려진 잔여 위험은 `docs/security-spec.md`에서 별도로 확인합니다. 커밋·push·PR·배포는 요청된 범위에서만 수행합니다.
