import modal

image = (
    modal.Image.from_registry(
        "nvidia/cuda:13.0.0-cudnn-devel-ubuntu22.04", add_python="3.12"
    )
    .apt_install("git", "ffmpeg")
    .run_commands(
        "git clone --branch v0.1.6 --depth 1 https://github.com/ace-step/ACE-Step-1.5.git /opt/ace-step",
    )
    .uv_pip_install(
        "/opt/ace-step", "hf_transfer==0.1.9", "torchcodec==0.10.0", "torch~=2.10.0"
    )
    .entrypoint([])
)

image = image.env(
    {"ACESTEP_PROJECT_ROOT": "/opt/ace-step", "HF_HUB_ENABLE_HF_TRANSFER": "1"}
)

checkpoints_dir = "/opt/ace-step/checkpoints"
model_cache = modal.Volume.from_name("ACE-Step-v15-model-cache", create_if_missing=True)
