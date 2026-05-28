# Modal Music Inference

Generate short music clips from text prompts using a React frontend, a FastAPI backend, and GPU inference on Modal.

This project demonstrates a practical split between:
- a local web/API layer for request handling and UX,
- and a remote GPU execution layer for heavy model inference.

## What The App Does

- Accepts a prompt, optional lyrics, duration, output format, and seed.
- Sends generation requests to a FastAPI endpoint.
- Runs music generation on a Modal GPU container.
- Streams generated audio bytes back to the client for immediate playback/download.

## High-Level Architecture

1. The frontend (`front-end/`) calls `POST /api/generate`.
2. Vite proxy forwards to backend `POST /generate` in local dev.
3. FastAPI validates request payload and invokes generation service.
4. Backend calls a Modal class method on GPU (`MusicGenerator.run`).
5. Modal container runs ACE-Step model inference and returns audio bytes.
6. FastAPI returns audio (`audio/mpeg` or `audio/wav`) with a filename.

## Major Backend Tech Details

### API Layer

- **FastAPI** exposes a single generation route: `POST /generate`.
- **Pydantic models** enforce payload constraints:
	- `duration` must be `> 0` and `< 60`
	- `format` is `mp3` or `wav`
	- `manual_seeds >= 1`
- API returns binary audio content directly, not only metadata.

### Inference Execution

- **Modal** is used for serverless GPU execution.
- Inference runs in a Modal class (`MusicGenerator`) with:
	- GPU type: `l40s`
	- Persistent model cache via Modal Volume (`ACE-Step-v15-model-cache`)
	- Remote method invocation (`.remote(...)`) from local API process
- The backend calls the in-app Modal class directly (`MusicGenerator().run.remote(...)`) so local runs do not depend on a separately deployed named app.

Relevant files:
- `app/music_generator.py`: Modal app/class, model initialization, generation method.
- `app/modal_init.py`: CUDA image build, ACE-Step checkout/install, volume config.

### Runtime and Serving

- **Granian** is used as the ASGI server in `app/app.py`.
- Environment variables control host/port/workers (`HOST`, `PORT`, `WORKERS`).
- Local reload is enabled when `ENVIRONMENT=local`.

### Model Stack (Inside Modal Container)

- Base image: `nvidia/cuda:13.0.0-cudnn-devel-ubuntu22.04`
- Python added in image build: `3.12`
- Installs/uses:
	- ACE-Step 1.5 codebase (`v0.1.6`)
	- `torch~=2.10.0`
	- `hf_transfer` for faster Hugging Face transfers
	- `ffmpeg` for media tooling
- Initializes both:
	- DiT/audio generation handler
	- LM handler (`vllm` backend) for prompt enhancement flow

## API Contract (Backend)

`POST /generate`

Example request body:

```json
{
	"prompt": "Dreamy synthwave with neon bass and cinematic drums",
	"lyrics": "City lights, midnight drive",
	"duration": 30,
	"format": "mp3",
	"manual_seeds": 1
}
```

Successful response:
- `200 OK`
- Body: raw audio bytes
- `Content-Type`: `audio/mpeg` or `audio/wav`

## Local Development

### Prerequisites

- Python/UV environment for backend.
- Bun for frontend scripts.
- Modal account + auth configured (`modal token new`).

### Install

Backend dependencies:

```bash
uv sync
```

Frontend dependencies:

```bash
bun install --cwd front-end
```

### Run

From repo root:

```bash
make dev
```

This starts:
- Backend on `http://127.0.0.1:8000`
- Frontend on `http://127.0.0.1:3000`

Vite proxy configuration routes frontend `/api/*` calls to the backend.

## Project Structure

```text
app/
	app.py              # FastAPI + Granian entrypoint
	generate.py         # Generation orchestration wrapper
	music_generator.py  # Modal GPU class and inference
	modal_init.py       # Modal image and volume config
front-end/
	src/App.tsx         # UI and submit/playback flow
	src/api.ts          # API client and response handling
```

## Notes

- First run can take longer due to model download/warmup.
- Generated filenames are derived from a slugified prompt.
- Duration is intentionally capped below 60 seconds by API validation.
