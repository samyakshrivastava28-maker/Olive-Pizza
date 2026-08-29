# 🎨 Olive Pizza — SDUI Multimodal Section Designer Overview

> [!IMPORTANT]
> The **Multimodal Section Designer** is a cutting-edge Server-Driven UI (SDUI) engine for Olive Pizza. It replaces traditional manual UI builders with a fully autonomous, orchestrated AI pipeline that combines layout reasoning, creative copy generation, rapid prototyping, and high-fidelity asset generation into a single unified workspace.

---

## 1. Executive Summary

The Section Designer operates as the central hub for the Restaurant Owner to instantly generate, modify, and preview their web and mobile app UI. By chatting with an orchestration model, the system automatically pulls available component structures from Google Stitch and dispatches tasks to specialized AI models to build a complete JSON-driven layout.

```text
                  ┌──────────────────────────────────────────────┐
                  │          MULTIMODAL SECTION DESIGNER         │
                  │             (Owner Dashboard)                │
                  └──────┬──────────────────┬──────────────┬─────┘
                         │                  │              │
                         ▼                  ▼              ▼
                ┌────────────────┐  ┌───────────────┐  ┌──────────────────┐
                │   LEFT PANE    │  │  HEAD MODEL   │  │   RIGHT PANE     │
                │ (Chat Console) │  │ (Orchestrator)│  │ (Live Canvas)    │
                └────────────────┘  └───────────────┘  └──────────────────┘
```

1. **Left Pane (Chat Console)**: The owner inputs their design requirements (e.g., "Build a dark-mode spicy pizza banner").
2. **Head Model (DeepSeek V4 Pro)**: Acts as the brain. It reads the prompt, fetches Stitch configurations, creates a build plan, and manages sub-models.
3. **Right Pane (Live Canvas)**: Displays a real-time, interactive preview of the generated JSON layout running on the actual frontend rendering engine.

---

## 2. Agentic Orchestration Architecture

The system uses a highly specialized multi-agent pipeline where each model has a distinct role. 

### 2.1 The Pipeline Models

| Model | Role | Provider | Purpose |
| :--- | :--- | :--- | :--- |
| **DeepSeek V4 Pro** | Head Orchestrator & Merger | NVIDIA NIM | Decides what needs to be built, delegates tasks to sub-models, and performs the final synthesis to output pure SDUI JSON. |
| **GLM 5.2** | Structural Reasoning | NVIDIA NIM | Focuses strictly on JSON layout structure, flexbox rules, and component hierarchy. |
| **Kimi 2.6** | Creative UX & Copy | NVIDIA NIM | Drafts highly engaging, conversion-optimized marketing copy and user flow logic. |
| **DeepSeek V4 Flash** | Rapid Component Drafting | NVIDIA NIM | Extremely fast at generating standard component blocks (buttons, headers, spacers). |
| **Qwen Image** | Food Photography | NVIDIA NIM | Generates premium, mouth-watering food photography for banners. |
| **FLUX** | Vector/Graphic Assets | NVIDIA NIM | Creates modern vector assets, background textures, and glassmorphic layers. |
| **Stable Diffusion 3 Large** | High Fidelity Branding | NVIDIA NIM | Generates ultra-high-fidelity, brand-compliant atmospheric imagery. |

### 2.2 Execution Flow

```text
                                   ┌────────────────────────┐
                                   │    OWNER REQUEST       │
                                   └───────────┬────────────┘
                                               │
                                               ▼
                                   ┌────────────────────────┐
                                   │  DEEPSEEK V4 PRO       │
                                   │  (Head Orchestrator)   │
                                   └─┬──────┬──────┬──────┬─┘
                                     │      │      │      │
           ┌─────────────────────────┘      │      │      └──────────────────────────┐
           ▼                                ▼      ▼                                 ▼
 ┌──────────────────┐            ┌────────────┐  ┌──────────────┐          ┌───────────────────┐
 │ GOOGLE STITCH    │            │  GLM 5.2   │  │  KIMI 2.6    │          │  ASSET MODELS     │
 │ (Component       │            │ (Structure)│  │ (UX Copy)    │          │ (FLUX / SD3 / Qwen)│
 │  Registry)       │            └────────────┘  └──────────────┘          └───────────────────┘
 └──────────────────┘
           │                                │      │                                 │
           └─────────────────────────┐      │      │      ┌──────────────────────────┘
                                     ▼      ▼      ▼      ▼
                                   ┌────────────────────────┐
                                   │  DEEPSEEK V4 PRO       │
                                   │  (Final Synthesis)     │
                                   └───────────┬────────────┘
                                               │
                                               ▼
                                   ┌────────────────────────┐
                                   │   VALID SDUI JSON      │
                                   │  (Firestore Draft)     │
                                   └────────────────────────┘
```

---

## 3. Integration with Google Stitch

Instead of hallucinating component structures, the orchestration pipeline is tightly integrated with **Google Stitch**.

1. **Discovery**: Before planning, DeepSeek V4 Pro queries `StitchService.listDesigns()` to retrieve the latest verified component schemas.
2. **Assignment**: DeepSeek maps the owner's request to valid Stitch components (e.g., mapping a "hero section" request to the `HeroBanner_V2` Stitch component).
3. **Enforcement**: During the final synthesis step, the backend dynamically scrubs the JSON to ensure all required `stitchDesignId` fields are present and that color tokens rigidly adhere to the Olive Pizza brand palette (`#55775a`, `#f97316`, `#0a0a0a`).

---

## 4. Frontend Rendering (Live Canvas)

The right panel of the Section Designer doesn't just show JSON—it actually executes it.

- **Dynamic Framer Motion**: As the final JSON is streamed back to the client, the right panel uses `AnimatePresence` and `motion.div` to smoothly fade and slide the new components into the preview window.
- **Brand Enforcement**: If a sub-model attempts to use a color outside the official design system, the `StitchColorMapper` aggressively overwrites it before it reaches the Canvas to prevent visual regressions.
- **Device Toggling**: Owners can toggle between a 375px mobile mockup (complete with simulated notch and bezels) and a responsive desktop view to ensure the SDUI layout works perfectly across all form factors.
