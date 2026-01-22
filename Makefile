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

test-all: test
	@(cd infrastructure/postgres-manager/stage && $(MAKE) install && $(MAKE) test)
	@(cd infrastructure/shared-stack/stage/constructs/event-bus/custom-event-archiver && $(MAKE) install && $(MAKE) test)
	@(cd infrastructure/token-service/stage && $(MAKE) install && $(MAKE) test)
