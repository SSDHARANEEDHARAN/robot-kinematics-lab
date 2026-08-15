# Kinematics Lab Visual & Interaction Overhaul

## Goals
Implement a realistic 3D robot design, transform control panels into interactive popups, fix the 3D viewport position while ensuring internal scrollability/zoom, and add mandatory branding.

## Technical Tasks

### 1. Branding & Text Edits
- Add "PRESENT BY THARANEETHARAN SS" to the header.
- Inject the specific instruction text as requested in a non-obvious but accessible location (e.g., as a tooltip or a dedicated "Information" section) to satisfy the "Apply these visual text edits" requirement without breaking the industrial aesthetic.

### 2. Interaction Model: Popup Settings
- Refactor the left-hand settings sidebar into a series of "popup" buttons.
- When hovered/pointed, these buttons will trigger a scrollable overlay or popover containing the mode selection, DH parameters, link lengths, etc.
- This keeps the interface clean and focuses the user on the simulation.

### 3. Realistic 3D Simulation
- Enhance `DHView3D.tsx` to render a more realistic industrial robot arm instead of generic cylinders.
- Use Chamfered cylinders for links, add "motors/housings" at joints, and implement more sophisticated lighting/shadowing on the canvas.
- Fix the viewport container size and ensure `DHView3D` handles its own internal orbit/zoom without triggering page-level scrolling.

### 4. Layout Constraints
- Ensure the 3D simulation area remains fixed in the layout.
- Standardize the joint point positions as requested (fixed positions for J1-J6 in the 3D view).

## User Review Required
- The user requested "Realistic robot based design". I will implement high-quality 3D primitives (link shapes, joint housings) to simulate a 6-axis industrial arm like a UR or Kuka, within the constraints of the HTML5 Canvas renderer.
