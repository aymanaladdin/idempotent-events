.PHONY: run test seed docker-up docker-test docker-seed install

install:
	npm install

run:
	npm run start:dev

test:
	npm test

seed:
	npm run db:seed

docker-up:
	docker compose up --build

docker-seed:
	docker compose --profile tools run --rm seeder

docker-test:
	docker compose --profile test run --rm test
