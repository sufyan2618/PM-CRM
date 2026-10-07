import type { FilterQuery } from "mongoose";
import { UserModel } from "../models/user.model";
import type { IUser, UserRole } from "../types/user";

export type LeanUser = {
  _id: { toString(): string };
  firstName: string;
  lastName: string;
  email: string;
  code: string;
  role: UserRole;
  specialization: string;
  skills: string[];
};

export const userRepository = {
  async findById(id: string): Promise<LeanUser | null> {
    return UserModel.findById(id).lean<LeanUser>();
  },

  async findByCode(code: string): Promise<LeanUser | null> {
    return UserModel.findOne({ code: code.toUpperCase() }).lean<LeanUser>();
  },

  async findByRole(role: UserRole): Promise<LeanUser[]> {
    return UserModel.find({ role }).lean<LeanUser[]>();
  },

  async listDirectory(role?: UserRole): Promise<LeanUser[]> {
    const filter: FilterQuery<IUser> = {};
    if (role) filter.role = role;
    return UserModel.find(filter)
      .select("firstName lastName code role specialization skills")
      .sort({ code: 1 })
      .lean<LeanUser[]>();
  },

  async listForAiDirectory(): Promise<LeanUser[]> {
    return UserModel.find({ role: { $in: ["MANAGER", "AGENT", "ADMIN"] } })
      .select("firstName lastName code role specialization skills")
      .sort({ code: 1 })
      .lean<LeanUser[]>();
  },

  async findManyByIds(ids: string[]): Promise<LeanUser[]> {
    return UserModel.find({ _id: { $in: ids } }).lean<LeanUser[]>();
  },
};
