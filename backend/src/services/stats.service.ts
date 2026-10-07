import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";

export async function getAdminStats() {
  const [projectCount, taskCount, totalEstimatedHours] = await Promise.all([
    projectRepository.countDocuments(),
    taskRepository.countDocuments(),
    taskRepository.sumEstimatedHours(),
  ]);

  return {
    projectCount,
    taskCount,
    totalEstimatedHours,
  };
}
