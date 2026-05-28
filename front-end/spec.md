# Frontend Specification: Music Generation SPA

## Goal
Build a simple React single-page application in the `front-end` folder that lets users submit music generation requests to the FastAPI backend, shows generation progress, and plays the generated audio when ready.

## Tech Stack
- React (SPA)
- Plain CSS (no UI framework required)
- Fetch API for backend communication

## Environment and API Routing
- Local development must use a frontend dev-server proxy to the backend.
- Frontend code should call a relative API path so it works with proxying.
- In production, requests must target the endpoint path `/api/generate`.
- Do not hardcode localhost backend URLs in production code.

## Backend Contract
The form payload must match the backend `GenerateRequest` schema.

```python
class GenerateRequest(BaseModel):
        model_config = ConfigDict(extra="forbid")

        prompt: Optional[str] = None
        lyrics: Optional[str] = None
        duration: Optional[float] = Field(default=30, gt=0, lt=60)
        format: Optional[Literal["mp3", "wav"]] = "mp3"
        manual_seeds: Optional[int] = Field(default=1, ge=1)
```

## UI Requirements

### Layout
- Single-page responsive layout.
- Main content centered with clear sectioning:
    - Header/title
    - Generation form
    - Status/loader area
    - Audio playback area
- Works on desktop and mobile widths.

### Form Fields
Provide controls for all request fields:
- `prompt` (optional text input or textarea)
- `lyrics` (optional multiline textarea)
- `duration` (number input, default `30`, must stay `> 0` and `< 60`)
- `format` (select: `mp3` or `wav`, default `mp3`)
- `manual_seeds` (number input, integer, minimum `1`, default `1`)

### Submission Behavior
- Submit button sends a request to FastAPI backend.
- Request URL rules:
    - Local dev: call `/generate` and rely on dev proxy forwarding to the backend service.
    - Production: call `/api/generate` directly.
- While a request is in progress:
    - Disable submit button and all form controls that would trigger another request.
    - Show loading state with:
        - Fun animation
        - Text: `Generating music...`
- User must not be able to submit another request until current generation completes or fails.

### Replace Previous Output
- If user starts a new generation after a previous one completed:
    - Remove previous audio from UI state.
    - Trigger backend behavior to delete/replace old generated file and create a new one.
- Frontend must always present only the latest generation result.

### Result Playback
- When generation succeeds:
    - Render an HTML5 audio player for the generated file.
    - Provide a clear label indicating file is ready.
- If backend returns a downloadable URL, use it as `audio` source.
- If backend returns binary/audio stream, convert to playable blob URL.

### Error Handling
- Show friendly error message on failed request.
- Keep message visible until next submission.
- Re-enable controls on failure.

## State Model
Minimum client state:
- `formValues`
- `isGenerating` (boolean)
- `currentAudioSrc` (string or null)
- `errorMessage` (string or null)

State transitions:
1. Idle -> Submit -> Generating
2. Generating -> Success -> Ready (audio player visible)
3. Generating -> Failure -> Error
4. Ready -> Submit new request -> Generating (old audio cleared first)

## Styling Requirements
- Music-themed visual identity (not generic form styling).
- Use custom CSS with:
    - expressive typography
    - album/stage-inspired accents
    - animated loader synchronized with generating state
- Responsive behavior:
    - touch-friendly spacing and controls on small screens
    - fluid container widths
    - no horizontal scrolling

## Accessibility and UX
- All inputs require visible labels.
- Buttons and controls should have clear focus states.
- Ensure sufficient text/background contrast.
- Loading and error states must be clearly communicated.

## Acceptance Criteria
- React SPA runs from `front-end` and displays generation form.
- Local development uses proxying to backend for `/api/generate` requests.
- Payload sent to backend matches `GenerateRequest` fields and constraints.
- During generation, UI shows animation and `Generating music...`, and blocks duplicate submits.
- On success, latest generated audio is playable in-app.
- On new request, previous audio is removed and replaced by new generation result.
- On backend error, user sees a friendly message and can retry.
- Production build sends generation requests to `/api/generate`.
- UI is responsive and visually music-themed.
