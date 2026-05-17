.PHONY: run test docker-up docker-test install

install:
	npm install

run:
	npm run start:dev

test:
	npm test

docker-up:
	docker compose up --build

docker-test:
	docker compose run --rm app sh -c "node scripts/migrate.js && npm test"
