# Kinematics Lab Expansion Plan

Implement the remaining core modules and features to transform the simulator into a complete robotics learning platform.

## Proposed Changes

### 1. Robotics Modules & Navigation
- Reorganize the app into 8 core modules: **Dashboard, Learn, Formula Lab, Simulator, Experiment Lab, Teach, Challenges, AI Tutor, Industrial Lab**.
- Implement a Sidebar navigation to switch between these modules.
- Add a "My Progress" dashboard tracking completion, quiz scores, and skills.

### 2. Experiment Lab & Workspace
- Implement a "Workspace Sweep" feature that samples reachable points and renders a heatmap/annulus live as link lengths change.
- Add a Singularity Lab that visualizes near-singular configurations (where the arm is fully extended or folded) with warnings.
- Add "Compare" functionality to see how workspace changes based on L1/L2 ratios.

### 3. Jacobian & Velocity Lab
- Extend the kinematics library to include Jacobian matrices for 2D arms.
- Visualize end-effector velocity vectors in the 2D viewport.
- Add a live Jacobian calculator showing the mapping from joint velocities to Cartesian velocities.

### 4. AI Tutor (Powered by Lovable AI Gateway)
- Implement a chat interface that acts as a "Robotics Teacher".
- Instead of giving answers, it provides hints based on the current state (e.g., "Your target is outside the reach zone, check your link lengths").
- Integration with the Lesson system to provide step-by-step guidance.

### 5. Industrial Lab
- Create specific scenarios like "Pick & Place" and "Palletizing".
- Add objects to the 2D/3D viewports that the robot can interact with.

## Technical Details
- **State Management**: Use a centralized state in `src/routes/index.tsx` (or a context) to allow modules to share robot parameters.
- **Visuals**: Enhance `ArmView2D` to support workspace heatmaps and velocity vectors using SVG.
- **AI**: Use `ai_gateway--create` for the AI Tutor, passing current simulation state as context.
- **Progress**: Persist progress in the browser (localStorage) or Lovable Cloud if enabled.
