export type Role = 'MANAGER' | 'EMPLOYEE';

export type TaskType =
  | 'Creative' | 'Video' | 'Carousel' | 'Ads' | 'Cover' | 'Branding' | 'Logo' | 'Brochure'
  | 'Presentation' | 'Packaging' | 'UiDesign' | 'WebsiteBanner' | 'SocialMedia' | 'Special'
  | 'LandingPage' | 'Illustration' | 'Animation' | 'Other';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DELAYED' | 'DONE' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type StakeholderRole = 'CREATIVE' | 'SMM' | 'SEO' | 'SALES' | 'DEVELOPMENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  phone?: string | null;
  status: string;
  isApprover?: boolean;
  designation?: string | null;
  workingHoursPerDay?: number;
  joinedAt?: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  headId?: string | null;
  _count?: { users?: number; tasks?: number };
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  industry?: string | null;
  website?: string | null;
  contractType: string;
  priority: string;
  status: string;
  brandColors?: Record<string, string> | null;
  fonts?: string[] | null;
  brandAssets?: string[] | null;
  description?: string | null;
  createdAt: string;
  stakeholders?: Stakeholder[];
  stakeholderLogs?: StakeholderLog[];
  tasks?: Task[];
  _count?: { tasks?: number; files?: number };
}

export interface StakeholderLog {
  id: string;
  role?: string | null;
  previousStakeholderId?: string | null;
  previousName?: string | null;
  newStakeholderId?: string | null;
  newName?: string | null;
  reason?: string | null;
  date: string;
  changedBy?: { id: string; name: string; avatar?: string | null } | null;
}

export interface Stakeholder {
  id: string;
  clientId: string;
  role: StakeholderRole;
  employeeId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  isActive: boolean;
  assignedAt?: string | null;
  employee?: { id: string; name: string; avatar?: string | null } | null;
  client?: Client;
  history?: StakeholderHistory[];
}

export interface StakeholderHistory {
  id: string;
  clientId: string;
  stakeholderId?: string | null;
  changedById?: string | null;
  changeType?: string | null;
  from?: any | null;
  to?: any | null;
  createdAt: string;
  changedBy?: { id: string; name: string } | null;
}

export interface StakeholderLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: any;
  createdAt: string;
  user: { id: string; name: string; avatar?: string | null };
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatar?: string | null };
}

export interface Task {
  id: string;
  date: string;
  dueDate?: string | null;
  taskType: TaskType;
  taskName: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  estimatedTime: number;
  actualTime: number;
  taskCount: number;
  revisionCount: number;
  completedAt?: string | null;
  clientId?: string | null;
  departmentId?: string | null;
  employeeId: string;
  reviewerId?: string | null;
  assignedById?: string | null;
  client?: { id: string; name: string; brandColors?: any } | null;
  employee?: { id: string; name: string; avatar?: string | null; designation?: string | null } | null;
  department?: { id: string; name: string; color?: string | null } | null;
  reviewer?: { id: string; name: string } | null;
  assignedBy?: { id: string; name: string } | null;
  comments?: TaskComment[];
  assignments?: { id: string; from?: { id: string; name: string } | null; to?: { id: string; name: string } | null; reason?: string | null; createdAt: string }[];
  attachments?: string[] | null;
  _count?: { files?: number };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  read: boolean;
  taskId?: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  action: string;
  userName?: string | null;
  entityType?: string | null;
  meta?: any;
  createdAt: string;
  user: { id: string; name: string; avatar?: string | null };
}
