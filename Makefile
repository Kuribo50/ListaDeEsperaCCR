.PHONY: up down migrate loaddata shell logs

up:
	docker-compose up -d

down:
	docker-compose down

migrate:
	docker-compose exec backend python manage.py migrate

loaddata:
	docker-compose exec backend python manage.py loaddata fixtures/initial_data.json

shell:
	docker-compose exec backend python manage.py shell

logs:
	docker-compose logs -f
