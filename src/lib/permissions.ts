import type { UserRole } from "@/types";

export const isAdmin = (role: UserRole) => role === "ADMIN";

export const isOperator = (role: UserRole) => role === "OPERATOR";

export const canAccessAdmin = (role: UserRole) => isAdmin(role);

export const canManageTopics = (role: UserRole) =>
  role === "ADMIN" || role === "OPERATOR";

export const canManageDepartments = (role: UserRole) => role === "ADMIN";

export const canCreateOperators = (role: UserRole) => role === "ADMIN";

export const canViewStats = (role: UserRole) => role === "ADMIN";
