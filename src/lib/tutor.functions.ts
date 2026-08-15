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
    const { reachable, ikError, mode, userQuestion, target, lengths, angles } = data;

    // Hinting logic: Step-by-step guidance without giving final answer
    if (userQuestion) {
      const q = userQuestion.toLowerCase();
      if (q.includes("unreachable") || q.includes("reach")) {
        const max = lengths.reduce((a, b) => a + b, 0);
        const dist = Math.sqrt(target.x ** 2 + target.y ** 2);
        return `Your total arm length is ${max.toFixed(0)} units, but the target is ${dist.toFixed(0)} units away. Recall that for a planar arm, the reachable workspace is a circle (or annulus) defined by the sum and difference of link lengths. How could you adjust the target or links to bridge that ${Math.max(0, dist - max).toFixed(0)} unit gap?`;
      }
      if (q.includes("singularity") || q.includes("error")) {
        return "Singularities occur when the Jacobian matrix loses rank (determinant approaches zero). In your case, check if the arm is fully extended or if joints are overlapping. When the arm is straight, it loses the ability to move in the radial direction instantly. What happens to the math when sin(theta2) is zero?";
      }
      return `I see you're exploring ${mode} mode. Remember that ${mode === "IK" ? "Inverse Kinematics finds joint angles for a target" : "Forward Kinematics calculates the tip position from angles"}. Look at the Math tab to see the live trigonometry updates!`;
    }

    if (!reachable && mode === "IK") {
      return "Hmm, that target seems to be playing hard to get! Look at the 'Reach' stat—it shows your minimum and maximum range. Is your target coordinate $(x^2 + y^2)$ within that squared range?";
    }

    if (ikError > 5 && mode === "IK") {
      return "The solver is close but not quite there. This often happens near a 'Workspace Boundary'. Try moving the target slightly inward to see if the error drops.";
    }

    return "Robot looking good! Did you know you can switch to 'Industrial' mode to see how this math applies to welding and palletizing?";
  });
