export const USER_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;
export const USER_STATUSES = ['pending', 'active', 'locked'] as const;
export const MUTABLE_USER_STATUSES = ['active', 'locked'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type MutableUserStatus = (typeof MUTABLE_USER_STATUSES)[number];

export interface AdministratorActor {
  id: string;
  email: string | null;
}

export interface UserAccessRecord {
  id: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login_at: string | null;
}

export interface UserAccessState {
  id: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  locked_reason: string | null;
  locked_at: string | null;
  locked_by: string | null;
}

export interface UserListInput {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  limit: number;
}

export interface UserListResult {
  data: UserAccessRecord[];
  count: number;
}

export interface UserAccessAdministrationRepository {
  list(input: UserListInput): Promise<UserListResult>;
  findById(userId: string): Promise<UserAccessState | null>;
  updateRole(userId: string, role: UserRole): Promise<void>;
  updateStatus(
    userId: string,
    update: {
      status: MutableUserStatus;
      lockedReason: string | null;
      lockedAt: string | null;
      lockedBy: string | null;
    }
  ): Promise<void>;
}

export interface RoleChangedEvent {
  actor: AdministratorActor;
  target: UserAccessState;
  previousRole: UserRole;
  role: UserRole;
}

export interface StatusChangedEvent {
  actor: AdministratorActor;
  target: UserAccessState;
  previousStatus: UserStatus;
  status: MutableUserStatus;
  lockedReason: string | null;
}

export interface UserAccessEffects {
  roleChanged(event: RoleChangedEvent): Promise<void>;
  statusChanged(event: StatusChangedEvent): Promise<void>;
}

export interface MutationResult {
  unchanged: boolean;
}
