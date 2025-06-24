.PHONY: test deep scan

check:
	@pnpm audit
	@pnpm prettier
	@pnpm lint
	@pre-commit run --all-files

fix:
	@pnpm prettier-fix
	@pnpm lint-fix

install:
	@pnpm install --frozen-lockfile

test:
	@pnpm test
	@(cd infrastructure/postgres-manager/stage && $(MAKE) test)
	@(cd infrastructure/token-service/stage && $(MAKE) test)
