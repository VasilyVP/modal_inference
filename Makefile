dev:
	bunx concurrently -k -n BE,FE -c green,blue "uv run python -m app.app" "bun run --cwd front-end dev"
