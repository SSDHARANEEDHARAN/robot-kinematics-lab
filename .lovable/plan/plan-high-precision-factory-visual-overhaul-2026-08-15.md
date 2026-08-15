# Plan: High-Precision Factory Visual Overhaul

Transform the current UI and 3D simulation into a "High-Precision Factory" aesthetic, featuring brushed aluminum textures, safety yellow accents, and tactile engineering details.

## User Review Required

> [!IMPORTANT]
> This will change the primary color palette from Slate/Orange to Aluminum/Safety Yellow and introduce more detailed mechanical textures in the 3D view.

- **Color Palette**: `#E2E8F0` (Aluminum), `#FACC15` (Safety Yellow), `#1E293B` (Deep Charcoal).
- **3D Robot**: Transition from "Cup" joints to "Brushed Hub" joints with safety warning stripes.

## Proposed Changes

### Styling & Branding
- Update `src/styles.css` (or `index.css`) with new theme variables for the "High-Precision Factory" look.
- Use high-contrast headers with safety yellow accents.

### 3D Simulation (`src/components/DHView3D.tsx`)
- Change `LINK_COLORS` to reflect aluminum and factory-spec colors.
- Redesign link rendering to look like brushed metal tubes.
- Update joint rendering with:
    - Brushed aluminum hub textures.
    - Safety yellow warning bands on moving parts.
    - Mechanical "bolt" patterns or metallic highlights.
- Update the background to a darker factory floor or high-contrast engineering grid.

### 2D Simulation (`src/components/ArmView2D.tsx`)
- Align 2D link colors with the new factory palette.
- Add safety yellow highlights to the end-effector.

### UI Components (`src/routes/index.tsx`)
- Update "Industrial Robot V2" badge to "Factory Precision V3".
- Adjust card borders and shadows to feel more "heavy-duty".

## Technical Details
- CSS variables will be updated to use the new palette.
- Canvas `createLinearGradient` patterns in `DHView3D.tsx` will be modified to simulate brushed metal.
- Collision and logic remains unchanged.
