---
name: Stellar Velocity
colors:
  surface: '#0f102c'
  surface-dim: '#0f102c'
  surface-bright: '#353755'
  surface-container-lowest: '#090b27'
  surface-container-low: '#171935'
  surface-container: '#1b1d39'
  surface-container-high: '#262744'
  surface-container-highest: '#303250'
  on-surface: '#e0e0ff'
  on-surface-variant: '#c0c7d1'
  inverse-surface: '#e0e0ff'
  inverse-on-surface: '#2c2e4b'
  outline: '#8a919a'
  outline-variant: '#40474f'
  surface-tint: '#94ccff'
  primary: '#94ccff'
  on-primary: '#003352'
  primary-container: '#62aae5'
  on-primary-container: '#003d60'
  inverse-primary: '#006398'
  secondary: '#ffb870'
  on-secondary: '#4a2800'
  secondary-container: '#d17d0a'
  on-secondary-container: '#402300'
  tertiary: '#b6c4ff'
  on-tertiary: '#1b2c65'
  tertiary-container: '#91a1e1'
  on-tertiary-container: '#25366f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#94ccff'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#004b74'
  secondary-fixed: '#ffdcbe'
  secondary-fixed-dim: '#ffb870'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#693c00'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b6c4ff'
  on-tertiary-fixed: '#00164f'
  on-tertiary-fixed-variant: '#33437d'
  background: '#0f102c'
  on-background: '#e0e0ff'
  surface-variant: '#303250'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
---

## Brand & Style

The design system is engineered for a premium, high-tech ride-sharing experience. It evokes a sense of "digital luxury"—combining the precision of aerospace instrumentation with the approachability of modern concierge services. The brand personality is confident, efficient, and futuristic.

The visual style is a sophisticated blend of **Glassmorphism** and **High-Contrast Modernism**. It utilizes deep, multi-layered backgrounds with vibrant glowing accents to simulate depth and focus. Elements appear to float over a cinematic deep-navy canvas, using translucent materials and "frosted" surfaces to manage complex information without overwhelming the user. The emotional response is one of reliability, speed, and exclusivity.

## Colors

The palette is anchored by a "Midnight Obsidian" base to emphasize the premium nature of the service. 

- **Primary (Electric Blue):** Used for interactive states, primary path indicators, and subtle glows. It represents technology and fluidity.
- **Secondary (Vibrant Orange):** Reserved for high-priority information, CTA accents, and status indicators (like vehicle locations or arrival timers). This provides the essential contrast against the cool-toned base.
- **Tertiary (Navy Gradient):** Acts as the middle ground for glass panels and surface elevations, bridging the deep background with the bright foreground.
- **Neutral (Deep Navy):** The foundational layer, providing a rich, high-contrast canvas that makes light and color pop.

**Surface Treatments:** Use a "Glass" surface defined by a 20-40% opacity white or light-blue tint with a 20px backdrop blur. Borders on these surfaces should be 1px wide, using a linear gradient (white at 20% to white at 0%) to simulate a light-catching edge.

## Typography

This design system utilizes **Plus Jakarta Sans** for its modern, geometric clarity and friendly curves, which softens the "high-tech" edge. 

- **Hierarchy:** Use `headline-xl` for prominent price points or arrival times.
- **Contrast:** Combine bold headlines with medium-weight labels to ensure legibility against dark, blurred backgrounds.
- **Readability:** For long-form text (rare in this UI), maintain a 1.5x line height.
- **Emphasis:** The Secondary Orange color should be applied to `headline-lg` when displaying critical ride data (e.g., "$20.05") to draw immediate focus.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a base-4 system. This ensures consistency across diverse mobile aspect ratios.

- **Mobile:** Use a 4-column grid with 16px gutters and 20px side margins.
- **Desktop/Tablet:** Transition to a 12-column grid. Content is centered with a max-width of 1200px.
- **Vertical Rhythm:** Elements are grouped in logical "containers" (glass panels). Use 24px (lg) spacing between major sections and 8px (sm) between related items within a section (e.g., driver name and rating).
- **Safe Areas:** Ensure interactive elements (buttons, inputs) maintain at least 48px of tappable height and are kept away from the extreme edges of the screen.

## Elevation & Depth

Depth is conveyed through **Backdrop Blurs** and **Glows** rather than traditional drop shadows.

1.  **Base Layer:** The deepest navy background.
2.  **Mid Layer (Floating Panels):** Glassmorphic cards with a 24px backdrop blur and a thin, 1px semi-transparent border. This layer should have a subtle inner-glow (Primary Blue at 10% opacity) to suggest volume.
3.  **Active Layer (Interactive):** Buttons and active indicators (like the arrival timer circle) utilize an external glow. Use a "Neon Blur" effect: a shadow with 0px offset, 15px-20px blur, and the accent color at 30% opacity.
4.  **Top Layer (Modal/Overlay):** Full-screen blurs that push the rest of the UI into the distance, keeping only the critical interaction (e.g., "Rate your trip") in sharp focus.

## Shapes

The design system uses a **Rounded** shape language to maintain a premium and approachable feel. 

- **Standard Elements:** Buttons, cards, and input fields use a `0.5rem` (8px) radius.
- **Large Containers:** Glass panels that hold significant content (like the "You arrived" card) use `rounded-xl` (1.5rem / 24px) to create a soft, protective feel.
- **Circular Elements:** Icons, timers, and profile avatars are always fully circular (pill/circle) to provide a geometric counterpoint to the rectangular cards.

## Components

- **Buttons:** Primary buttons use a solid gradient (Primary to Secondary) or a vibrant Primary fill. Secondary/Ghost buttons are glass-based with a visible border.
- **Glass Cards:** The signature component. They must have a `backdrop-filter: blur(20px)` and a subtle `linear-gradient` border.
- **Arrival Timer:** A circular progress indicator using the Secondary Orange. The stroke should have a soft outer glow.
- **Chips/Status:** Small pill-shaped containers with 10% opacity fills of the primary or secondary color to highlight trip details (e.g., "8 km").
- **Inputs:** Darker than the base background but with a 1px Primary Blue border when focused.
- **Driver Profile:** A compact layout combining a circular avatar, bold name typography, and a secondary-colored star rating.
- **Rating Stars:** Use the Secondary Orange (#F59A2F) for active stars, creating a "gold" premium effect.