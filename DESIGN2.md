# Design System Specification: Mirigliani Editorial Excellence

## 1. Overview & Creative North Star
**The Creative North Star: "The Timeless Atelier"**

This design system rejects the "SaaS-standard" aesthetic in favor of a high-end, B2B editorial experience. Mirigliani represents the intersection of industrial precision and monumental artistry. To reflect this, the design system avoids rigid, boxed-in grids and instead utilizes **Intentional Asymmetry** and **Tonal Depth**.

The UI should feel like a curated gallery of marble and craftsmanship. We achieve this through "The Breathing Canvas" approach—utilizing extreme white space (`spacing.20+`) and overlapping elements to create a sense of physical layering, as if viewing architectural drafts on a marble desktop.

---

## 2. Color & Surface Architecture
The palette is rooted in the "Deep Navy" of authority and the "Warm White" of premium stone.

### Palette Strategy
- **Primary (`#031634`)**: The anchor. Used for high-impact brand moments and key navigation.
- **Tertiary/Accent (`#C9A96E`)**: Representing brass and gold leaf. Used sparingly for precision elements: active states, subtle highlights, and "Craftsmanship" badges.
- **The Neutrals (`#FAF9F6` to `#E3E2DF`)**: A spectrum of "Warm Bone" and "Light Marble" that provides the foundation for our layering principle.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using `1px` solid borders for sectioning or containment. Boundaries must be defined solely through background color shifts or subtle tonal transitions.
* *Example:* A `surface_container_low` section sitting on a `background` provides all the separation required. If you feel a line is needed, use more white space instead.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine paper or slabs of stone.
1. **Background (`#FAF9F6`)**: The base floor.
2. **Surface (`#FFFFFF`)**: Primary content cards or floating navigation.
3. **Surface Container Tiers**: Use `surface_container_low` (`#F4F3F0`) for background sections and `surface_container_high` (`#E9E8E5`) for inset utility areas (e.g., sidebars or search filters).

### The "Glass & Signature" Rule
To add visual "soul," use **Glassmorphism** for floating elements (like a sticky header). Utilize a `surface` color at 80% opacity with a `20px` backdrop-blur. For primary CTAs, apply a subtle linear gradient from `primary` (`#031634`) to `primary_container` (`#1A2B4A`) at a 135-degree angle to mimic the sheen of polished granite.

---

## 3. Typography: The Editorial Voice
Our typography establishes a dialogue between traditional heritage (`Newsreader/Playfair Display`) and modern efficiency (`Inter`).

| Role | Token | Font | Size | Weight | Character |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Newsreader | 3.5rem | 400 | Elegant, serif, low kerning |
| **Headline**| `headline-md` | Newsreader | 1.75rem | 500 | Authoritative, scholarly |
| **Title** | `title-lg` | Inter | 1.375rem | 600 | Clear, modern, functional |
| **Body** | `body-lg` | Inter | 1rem | 400 | Highly legible, generous leading |
| **Label** | `label-md` | Inter | 0.75rem | 700 | All-caps for metadata/status |
| **Data** | `ui-mono` | JetBrains Mono| 0.875rem | 400 | For SKU numbers & measurements |

**Creative Note:** Use `display-lg` for hero statements with intentional negative margin-left to "break" the grid slightly, creating an editorial, high-fashion layout.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural lines.

### The Layering Principle
Place a `surface_container_lowest` card (Pure White) on a `surface_container_low` section. This creates a soft, natural lift without the need for a shadow.

### Ambient Shadows
When a component must float (e.g., a modal or a primary dropdown), use the following shadow:
* **Token:** `shadow-warm`
* **Values:** `0 12px 32px rgba(26, 43, 74, 0.06), 0 2px 8px rgba(26, 43, 74, 0.04)`
* **Note:** The shadow color is tinted with our Deep Navy, making the shadow feel like a natural light occlusion on a stone surface rather than a generic grey blur.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in a high-density table), use the **Ghost Border**: `outline_variant` at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components & Signature Patterns

### Buttons: The Weighted Slab
* **Primary**: `primary` background, white text. No shadow. On hover, use a subtle 4px lift with a `shadow-warm`.
* **Tertiary**: No background. `label-md` text in `primary`. Underlined with a 2px `tertiary_fixed` (`#E4C285`) stroke that extends on hover.

### Inputs: The Inset Field
* **Style**: Use `surface_container_lowest` background. No border. A bottom-only stroke of 1px `outline_variant` that transforms into `tertiary` (Gold) upon focus.

### Cards: The Monument Style
* **Constraint**: Forbid the use of divider lines. Separate card content using `spacing.6` (1.5rem) or by shifting the background of the footer area to `surface_container_low`.
* **Layout**: Use asymmetrical padding (e.g., `pt-10 pr-6 pb-6 pl-6`) to create an editorial feel.

### Specialized Component: The "Stone Swatch" Chip
For marble selection, use a chip that features a circular `16px` image preview of the marble texture, followed by `label-md` text. The chip background should be `surface_container_highest` with a `full` radius.

---

## 6. Do’s and Don’ts

### Do
* **Do** use extreme vertical spacing (`80px-120px`) between major landing sections to convey a sense of "Respectful Silence."
* **Do** mix serif and sans-serif in close proximity (e.g., a Serif Headline with a Sans-serif sub-headline).
* **Do** use `JetBrains Mono` for all technical marble specifications (weight, density, SKU) to imply industrial precision.

### Don't
* **Don’t** use pure black `#000000`. Use `primary` or `on_surface` for all text.
* **Don’t** use standard 1px borders. If you find yourself reaching for a border, increase the padding or change the background color of the container.
* **Don’t** use bright, saturated colors for success/error messages. Use the muted `error_container` (`#FFDAD6`) to keep the tone "Serious and Respectful."
* **Don't** use "Card Shadows" on every element. Let the content breathe on the flat, warm white surface.