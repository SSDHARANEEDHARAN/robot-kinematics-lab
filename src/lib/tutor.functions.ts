import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getTutorHint = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        mode: z.string(),
        target: z.object({ x: z.number(), y: z.number() }),
        lengths: z.array(z.number()),
        angles: z.array(z.number()),
        reachable: z.boolean(),
        ikError: z.number(),
        userQuestion: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // In a real app, this would call AI Gateway
    // For now, we'll return structured hints based on the state
    const { reachable, ikError, mode, userQuestion } = data;

    if (userQuestion) {
      return `I see you're asking about "${userQuestion}". In ${mode} mode, the relationship between joint angles and position is defined by the Jacobian matrix. Try moving the sliders to see how the velocity vector changes!`;
    }

    if (!reachable && mode === "IK") {
      return "The target is outside your reach zone. Try increasing the link lengths or moving the target closer to the base.";
    }

    if (ikError > 10 && mode === "IK") {
      return "The IK solver is struggling to find a precise solution. This often happens near singularities—when the arm is fully extended or folded.";
    }

    return "You're doing great! Try switching to 'Teach' mode to save some waypoints and create a trajectory.";
  });
