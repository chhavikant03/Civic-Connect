# Offline Civic Assistant

Civic-Connect uses the `Gemma 4 1B Instruct (INT4)` variant as the target on-device model. It is intentionally kept behind `src/services/localAssistant.js`, separate from the UI, so a native WebGPU/WebAssembly runtime can replace the adapter without changing conversation or model-management screens.

## Setup and support

Set `VITE_GEMMA_MODEL_URL` to an approved, same-origin or CORS-enabled Gemma 4 artifact. The assistant shows the model size and download progress, stores the downloaded artifact in the browser Cache API, and stores conversation metadata locally. Generation never calls a remote AI endpoint.

The INT4 variant is intended for modern Chromium-based browsers with WebGPU or a native wrapper with at least 4 GB RAM and approximately 1.2 GB free storage. iOS Safari, older browsers, and devices without enough memory are unsupported for model generation; users should use the recovery message to free storage, update the browser, or continue with the normal Civic-Connect flows.

Model acquisition requires connectivity. After installation, supported civic prompts continue in airplane mode. Clearing site data removes the model and local conversations. The current web adapter provides an offline civic fallback while the production WebGPU/native Gemma runtime is integrated.
