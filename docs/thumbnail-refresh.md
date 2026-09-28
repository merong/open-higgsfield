# Studio thumbnail refresh

Generated 25 original images with the built-in `image_gen` tool, one call per asset: 12 image prompt examples, 12 cinematic video stills, and one landing-page feature illustration. Files and exact prompts are recorded in [thumbnail-manifest.json](thumbnail-manifest.json). Runtime files live in `public/content/thumbnails/` as 640px WebP files (1,516,520 bytes total). Originals are preserved outside the runtime bundle.

The shared thumbnail registry pairs shuffled sample prompts with their corresponding images. Studio Image/Video starters, Assets/Favorites empty-state examples, model fallback swatches, and legacy history artwork now use local image assets. Actual generated media URLs and favorites are preserved. Project format cards share feature images with the new-project chooser; card news reuses the existing generated pool editorial photo. Decorative gradients used for controls, loading states and text readability remain.

## Button contrast

The global `.workspace a` reset overrode the design-system primary button color. The reset now excludes `.ohf-btn` and has lower specificity. The existing `--accent-ink: #141a02` token correctly controls link buttons; no token replacement was needed. Browser computed color for “＋ 새 프로젝트” is `rgb(20, 26, 2)`.

## Verification

- TypeScript and production build passed; nine tests passed, including thumbnail file coverage and legacy artwork migration without media/favorite loss.
- In-app browser: Image/Video prompt thumbnails, Assets/Favorites examples and all three project format thumbnails loaded successfully.
- Selecting an image starter populated the composer prompt without submitting generation.
- Desktop project page has no horizontal overflow and the primary button uses the correct foreground token.
- At 390px, the studio has no horizontal overflow. Restored measured composer bottom clearance so all three starter cards can scroll above it (last card bottom 505px; composer top 541px).
- Screenshots: [projects](qa/projects-thumbnails-contrast.png), [image studio](qa/studio-image-thumbnails.png), [video studio](qa/studio-video-thumbnails.png), [new project](qa/new-project-thumbnails.png), [mobile](qa/studio-thumbnails-mobile.png).

Local verification only; no production deployment or paid generation requests were submitted through the application.
