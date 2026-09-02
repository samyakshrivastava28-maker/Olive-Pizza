---
name: playwright-cli
description: >
  Instructions for using the Playwright CLI (@playwright/cli). Use for browser
  automation, end-to-end testing, visual regression, capturing full-page screenshots,
  generating PDF reports, running interactive code generation, and inspecting DOM elements.
---

# Playwright CLI (@playwright/cli)

Playwright CLI provides high-level browser automation, web testing, and diagnostic tools across Chromium, Firefox, and WebKit.

## Global Installation & Verification

Installed globally:
```bash
npm install -g @playwright/cli@latest
playwright-cli --version
```

## Core Commands

### 1. Open Page & Interactive Inspection
```bash
playwright-cli open https://olivepizza-owner.onrender.com
```

### 2. Take Screenshots
```bash
# Capture full page screenshot
playwright-cli screenshot --full-page https://olivepizza-owner.onrender.com output.png

# Capture specific viewport (mobile emulation)
playwright-cli screenshot --device="iPhone 14" https://olivepizza-owner.onrender.com mobile_home.png
```

### 3. Generate PDF of Web Page
```bash
playwright-cli pdf https://olivepizza-owner.onrender.com report.pdf
```

### 4. Code Generation (Codegen)
Record user interactions and generate automated test scripts:
```bash
playwright-cli codegen https://localhost:5173
```

### 5. Run Tests
```bash
npx playwright test
```

## Best Practices
- Use headless mode for CI/CD runs.
- Set `--timeout` appropriately on slow/remote environments.
- Use mobile device presets (`--device="Pixel 7"`, `--device="iPhone 14"`) to verify responsive design.
