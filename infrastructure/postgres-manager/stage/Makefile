.PHONY: test

install:
	@corepack enable
	@yarn install --immutable

up:
	@docker compose up --wait -d || true
	@docker logs orcabus_db

down:
	@docker compose down

suite:
	@yarn test --silent --forceExit

# The default outer `tests` target only run the top level cdk application unit tests under `./test`
test: install up suite down
