.PHONY: dev prod prod-be

dev:
	bunx concurrently -k -n BE,FE -c green,blue "uv run python -m app.app" "bun run --cwd front-end dev"

prod:
	$(MAKE) prod-be

prod-be:
	ENVIRONMENT=prod HOST=0.0.0.0 uv run python -m app.app

