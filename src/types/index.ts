import type { Models } from "appwrite";

export type UserRole = "ADMIN" | "OPERATOR";

export type AuthUser = {
  $id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId: string | null;
  isActive: boolean;
};

export type ProfileDoc = Models.Document & {
  userId: string;
  fullName: string;
  role: UserRole;
  departmentId?: string;
  createdAt: string;
};

export type DepartmentDoc = Models.Document & {
  name: string;
  code?: string;
  createdAt: string;
};

export type VkrTopicDoc = Models.Document & {
  title: string;
  normalizedTitle: string;
  departmentId: string;
  createdByUserId: string;
  studentName?: string;
  supervisorName?: string;
  year?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
