from pathlib import Path
from typing import Optional
import modal

from app.modal_init import image, checkpoints_dir, model_cache

app_name = "generate-music"

modal_app = modal.App(app_name)

@modal_app.cls(gpu="l40s", image=image, volumes={checkpoints_dir: model_cache})
class MusicGenerator:
    @modal.enter()
    def init(self):
        from acestep.handler import AceStepHandler  # type: ignore
        from acestep.llm_inference import LLMHandler  # type: ignore
        from acestep.model_downloader import ensure_lm_model, ensure_main_model  # type: ignore

        # Download models if not already cached in the Volume.
        lm_model_name = "acestep-5Hz-lm-4B"
        ensure_main_model(checkpoints_dir=checkpoints_dir)
        ensure_lm_model(model_name=lm_model_name, checkpoints_dir=checkpoints_dir)

        # Initialize the audio generation model.
        self.dit_handler = AceStepHandler()
        init_status, enable_generate = self.dit_handler.initialize_service(
            project_root="/opt/ace-step",
            config_path="acestep-v15-turbo",
            device="cuda",
        )
        if not enable_generate:
            raise RuntimeError(f"DiT model initialization failed: {init_status}")

        # Initialize the language model for prompt enhancement.
        self.llm_handler = LLMHandler()
        lm_status, lm_success = self.llm_handler.initialize(
            checkpoint_dir=checkpoints_dir,
            lm_model_path=lm_model_name,
            backend="vllm",
            device="cuda",
        )
        if not lm_success:
            raise RuntimeError(f"LM initialization failed: {lm_status}")

    @modal.method()
    def run(
        self,
        prompt: str,
        lyrics: str,
        duration: float = 60.0,
        format: str = "mp3",  # or wav
        manual_seeds: Optional[int] = 1,
    ) -> bytes:
        from acestep.inference import GenerationConfig, GenerationParams, generate_music  # type: ignore

        params = GenerationParams(
            caption=prompt,
            lyrics=lyrics,
            duration=duration,
            thinking=True,
        )
        config = GenerationConfig(
            audio_format=format,
            batch_size=1,
            seeds=[manual_seeds] if manual_seeds is not None else None,
            use_random_seed=manual_seeds is None,
        )
        result = generate_music(
            self.dit_handler,
            self.llm_handler,
            params,
            config,
            save_dir="/dev/shm",
        )
        if not result.success:
            raise RuntimeError(f"Music generation failed: {result.error}")
        return Path(result.audios[0]["path"]).read_bytes()
