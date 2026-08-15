# Plan - UI Style Refresh

The objective is to update the "Kinematics Lab" UI to a modern "Glassmorphism & Industrial Dark" aesthetic while maintaining the core functionality. We will shift from the light laboratory theme to a high-contrast dark theme with vibrant accents, glass-like surfaces, and refined typography.

## User Review Required

> [!IMPORTANT]
> This change will shift the app to a "Dark Mode" by default with neon accents (Cyan/Indigo). If you prefer to stay in light mode, please let me know.

- **Color Palette**: Dark slate background (`oklch(0.15 0.02 250)`) with semi-transparent glass cards.
- **Accents**: Neon Cyan (`oklch(0.7 0.2 190)`) for primary actions and Indigo (`oklch(0.6 0.2 280)`) for secondary highlights.
- **Typography**: Retain Plus Jakarta Sans but adjust weights and letter-spacing for a "Tech" feel.
- **Components**: Rounded corners increased to `1rem`, heavy glass-blur effects (`backdrop-blur-xl`), and subtle inner-glows on cards.

## Proposed Changes

### Design System Update
- Update `src/styles.css` with new OKLCH tokens for dark mode.
- Add `glass-card` utility for consistent blurred surfaces.
- Enhance `input[type="range"]` and `lab-input` with glowing focus states.

### Component Styling
- Refactor `src/components/LabControls.tsx` to use the new glassmorphism utilities.
- Update `SegButton` to use a "sliding" background indicator with high contrast.
- Update `Stat` cards to include a subtle gradient border.

### Viewport Adjustments
- Update `ArmView2D.tsx` and `DHView3D.tsx` to ensure grids and labels are high-contrast against the new dark background.
- Adjust the 3D floor and robot materials to reflect a "Night Lab" aesthetic with emissive light highlights.

## Technical Details
- **CSS Variables**: Redefining `--background`, `--card`, `--primary`, and `--border` within `:root` to be dark-first.
- **Tailwind v4**: Using `@utility` for custom design tokens.
- **Backdrop Filters**: Utilizing `backdrop-blur-md` for panels to create depth.
