# Design System Document

## 1. Overview & Creative North Star: "The Silent Authority"

This design system is engineered for the B2B funeral furnishing sector—a space where dignity, permanence, and restraint are the ultimate expressions of luxury. Moving away from common e-commerce tropes, this system adopts the "Silent Authority" North Star. It behaves like a high-end architectural monograph: expensive, austere, and profoundly intentional.

The aesthetic breaks the standard "template" look by utilizing extreme typographic scales and high-contrast editorial layouts. We reject rounded corners and soft shapes in favor of sharp 0px radii, symbolizing precision and the unwavering nature of the industry. Through the use of deep navy tones, gold accents, and a "breathing" layout, we create a digital environment that feels more like a private showroom than a website.

---

## 2. Colors

The palette is rooted in a nocturnal navy spectrum, punctuated by the warmth of gold. It is designed to feel "heavy" and premium.

### Palette Overview
- **Surface (Background):** `#071325` (Background) — A deep, void-like navy that provides the canvas for dramatic lighting.
- **On-Surface (Primary Text):** `#FFFFFF` — Pure white, used exclusively for high-impact headlines and essential readability.
- **Secondary Text:** `#8A9BB5` (On-Secondary-Container) — A muted, atmospheric blue-grey for descriptions and supporting data.
- **Accent:** `#C9A96E` (Primary-Container) — A sophisticated gold/bronze, used for key calls to action and heritage-focused highlights.

### The "No-Line" Rule
To maintain a high-fashion editorial feel, 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined by background color shifts. For example, a `surface-container-low` section should transition into a `surface` section without a stroke. This creates a seamless, "dipped" appearance that feels integrated rather than boxed in.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers.
- **Base Level:** `surface` (`#071325`)
- **Card/Component Level:** `surface-container` (`#142032`)
- **Interactive/Hover Level:** `surface-container-high` (`#1f2a3d`)

### Signature Textures
Avoid flat blocks of color on hero sections. Use subtle radial gradients transitioning from `primary` (`#e6c487`) to `primary-container` (`#c9a96e`) behind high-end product photography to create a "halo" effect that mimics professional studio lighting.

---

## 3. Typography

The typographic system is the core of this brand’s voice: authoritative and unapologetic.

- **Display & Headlines:** 'Inter', Weight 900 (Ultra-Bold). ALL CAPS.
- **Scale:** 120px–140px.
- **Leading:** 0.88–0.92. The letters should almost touch, creating a "block" of text that feels like a physical monument.
- **Body:** 'Inter', Weight 300–400.
- **Scale:** 15px (1rem).
- **Line-height:** 1.6. Generous leading is required here to provide a "breathing" contrast to the dense, heavy headlines.
- **Labels & UI Metadata:** 'Inter', Weight 500. ALL CAPS.
- **Letter Spacing:** 0.15em. This creates an "expensive" feel, often seen in luxury watch and automotive branding.

---

## 4. Elevation & Depth

We eschew traditional "Drop Shadows" in favor of **Tonal Layering**.

- **The Layering Principle:** Depth is achieved by "stacking" surface tiers. To make an element "pop," place a `surface-container-lowest` card on a `surface-container-low` section. The subtle shift in hex code is enough to signal hierarchy to the eye without the clutter of shadows.
- **Ambient Shadows:** If a floating element (like a modal) is required, use a tinted shadow: `rgba(7, 19, 37, 0.6)` with a blur of 40px–60px. It should look like an eclipse, not a shadow.
- **The "Ghost Border" Fallback:** If a container must be outlined (e.g., in high-density data tables), use the `outline-variant` (`#4d463a`) at 20% opacity. 100% opaque borders are forbidden as they break the atmospheric immersion.
- **Glassmorphism:** For navigation bars or floating action menus, use `surface-bright` with a 15px backdrop-blur and 60% opacity. This allows product photography to bleed through the UI, maintaining a sense of place.

---

## 5. Components

### Buttons
- **Style:** Outlined Only. Fill is only permitted for error states.
- **Corners:** 0px (Sharp).
- **Border:** 1px solid. Use Gold (`#C9A96E`) for Primary and White (`#FFFFFF`) for Secondary.
- **Interaction:** On hover, the text color remains the same, but the background should shift to a 5% opacity version of the border color.

### Input Fields
- **State:** Underline only (bottom border). No 4-sided boxes.
- **Label:** ALL CAPS, 11px, `secondary-text` color, positioned above the line.
- **Focus:** The gold `primary` color should animate the underline from the center outwards.

### Cards & Lists
- **Rule:** Forbid the use of divider lines between list items. Use the Spacing Scale (specifically `spacing-8` or `spacing-10`) to create "White Space Dividers."
- **Content:** Images in cards must use deep vignettes that blend into the `#0A1628` background, making the product appear as if it is emerging from the shadows.

### Tooltips
- **Style:** `surface-container-highest` background with white text. No arrow/chevron. Sharp 0px corners.

---

## 6. Do’s and Don’ts

### Do:
- **Use Intentional Asymmetry:** In split sections, let the image take 60% of the width and the text 40% to create a dynamic, editorial rhythm.
- **Embrace Negative Space:** If a section feels "empty," it is likely correct. Luxury is defined by the space you don't fill.
- **Maintain Sharpness:** Every corner must be 0px. This conveys the precision of craftsmanship.

### Don’t:
- **No Rounded Corners:** Never use `border-radius`. It softens the brand and makes it feel consumer-grade rather than B2B luxury.
- **No Generic Icons:** Use ultra-thin (1pt) stroke icons only. Avoid "filled" icons which look too digital and "app-like."
- **No Centered Body Text:** Headlines can be centered for impact, but body copy must always be left-aligned to maintain the editorial grid.
- **No High-Contrast Dividers:** Avoid using pure white for lines. Use `divider-lines` (`#1E2D45`) to keep the interface moody and cohesive.