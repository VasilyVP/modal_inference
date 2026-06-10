from dotenv import load_dotenv

load_dotenv()
import logging
import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictInt, StrictStr
from typing import Literal
from app.generate import generate
from app.music_generator import modal_app

from app.utils import slugify

SAMPLE_AUDIO_PATH = Path(__file__).with_name("sample.mp3")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# Global variable to hold the Modal app context for the lifespan of the FastAPI worker.
@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global _modal_app_ctx

    # Keep the Modal app context alive for the whole FastAPI worker lifecycle.
    logger.info("Initializing Modal app context for API worker...")

    modal_ctx = modal_app.run()

    await modal_ctx.__aenter__()
    try:
        yield
    finally:
        await modal_ctx.__aexit__(None, None, None)


app = FastAPI(lifespan=lifespan)


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: str
    lyrics: StrictStr = Field(default="[Instrumental]")
    duration: StrictFloat = Field(default=30.0, gt=0, lt=60)
    format: Literal["mp3", "wav"] = Field(default="mp3")
    manual_seeds: StrictInt = Field(default=1, ge=1, lt=5)


@app.post("/generate")
def generate_music(props: GenerateRequest):
    try:
        clip = generate(
            prompt=props.prompt,
            lyrics=props.lyrics,
            duration=props.duration,
            format=props.format,
            manual_seeds=props.manual_seeds,
        )
    except RuntimeError as exc:
        logger.error("Error generating music: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    audio_format = props.format
    prompt = props.prompt
    filename = f"{slugify(prompt)[:64]}.{audio_format}"
    media_type = "audio/mpeg" if audio_format == "mp3" else "audio/wav"

    return Response(
        content=clip,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def run() -> None:
    from granian import Granian
    from granian.constants import Interfaces

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    workers = int(os.getenv("WORKERS", "1"))

    Granian(
        "app.app:app",
        interface=Interfaces.ASGI,
        address=host,
        port=port,
        workers=workers,
        reload=True if os.getenv("ENVIRONMENT") == "local" else False,
    ).serve()


if __name__ == "__main__":
    run()
