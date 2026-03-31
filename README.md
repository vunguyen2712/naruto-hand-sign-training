# Naruto Hand Sign Trainer

Naruto Hand Sign Trainer is a browser-based webcam game for local development and easy deployment. It uses MediaPipe hand landmarks in the browser, evaluates a real gesture definition for the Shadow Clone hand sign, overlays live tracking feedback, and triggers a clone-summoning effect built from sampled webcam frames.

## Features

- Real-time webcam capture and two-hand landmark tracking in the browser
- Practice mode with debug overlay, confidence feedback, threshold tuning, and guidance hints
- Play mode with a cleaner live-view presentation
- Modular jutsu registry with placeholders for Fireball Jutsu and Chidori
- Shadow Clone effect that spawns up to 10 webcam-based clones one by one with white smoke puffs
- Unit and integration tests
- Research, architecture, QA, deployment, and roadmap notes in `docs/`

## Stack

- React + TypeScript + Vite
- MediaPipe Tasks Vision `HandLandmarker`
- Layered HTML video + SVG + canvas rendering
- Vitest + Testing Library

## Local Development

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

## GitHub Pages

This repo includes a GitHub Pages workflow in `.github/workflows/deploy-pages.yml`.

The site will publish from the repository Pages deployment once GitHub Pages is configured to use GitHub Actions.
