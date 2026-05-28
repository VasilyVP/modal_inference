import logging
from app.music_generator import MusicGenerator
from app.music_generator import modal_app

logger = logging.getLogger(__name__)


def generate(
    prompt: str,
    lyrics: str,
    duration: float,
    format: str,  # or wav
    manual_seeds: int = 1,
):
    logger.info(
        f"Generating {duration} seconds of music from prompt '{prompt[:32] + ('...' if len(prompt) > 32 else '')}'"
        f" and lyrics '{lyrics[:32] + ('...' if len(lyrics) > 32 else '')}'"
    )

    try:
        # Call the class defined in this app directly so local runs don't depend on
        # a separately deployed app existing in the selected Modal environment.
        clip = MusicGenerator().run.remote(
            prompt,
            lyrics,
            duration=duration,
            format=format,
            manual_seeds=manual_seeds,
        )
        return clip
    except Exception as e:
        logger.error(f"Error during music generation: {e}")
        raise
    finally:
        # modal_app_instance.stop()  # Stop the Modal app after the generation is done to free up resources.
        logger.info("Music generation request completed.")
