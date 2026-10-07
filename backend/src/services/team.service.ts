import { userRepository } from "../repositories/user.repository";
import type { UserRole } from "../types/user";
import { toTeamMemberDto } from "../utils/dto";

export async function listTeam(role?: UserRole) {
  const users = await userRepository.listDirectory(role);
  return users.map(toTeamMemberDto);
}
