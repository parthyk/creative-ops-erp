import type { Priority, StakeholderRole, TaskStatus, TaskType } from './types';

export const TASK_TYPES: TaskType[] = [
  'Creative', 'Video', 'Carousel', 'Ads', 'Cover', 'Branding', 'Logo', 'Brochure',
  'Presentation', 'Packaging', 'UiDesign', 'WebsiteBanner', 'SocialMedia', 'Special',
  'LandingPage', 'Illustration', 'Animation', 'Other',
];

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DELAYED', 'DONE', 'CANCELLED'];

export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const DEPARTMENTS = ['Creative', 'SMM', 'SEO', 'Development', 'Sales'];

export const STAKEHOLDER_ROLES: StakeholderRole[] = ['CREATIVE', 'SMM', 'SEO', 'SALES', 'DEVELOPMENT'];

export const STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  TODO: { label: 'To Do', color: 'bg-slate-400', dot: 'bg-slate-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-500', dot: 'bg-blue-500' },
  IN_REVIEW: { label: 'In Review', color: 'bg-amber-500', dot: 'bg-amber-500' },
  DELAYED: { label: 'Delayed', color: 'bg-red-500', dot: 'bg-red-500' },
  DONE: { label: 'Done', color: 'bg-emerald-500', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-400', dot: 'bg-slate-400' },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-400/15 text-slate-600 dark:text-slate-300' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-300' },
  HIGH: { label: 'High', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  URGENT: { label: 'Urgent', color: 'bg-red-500/15 text-red-600 dark:text-red-300' },
};

export const STAKEHOLDER_META: Record<StakeholderRole, { label: string; color: string }> = {
  CREATIVE: { label: 'Creative', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  SMM: { label: 'SMM', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-300' },
  SEO: { label: 'SEO', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  SALES: { label: 'Sales', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  DEVELOPMENT: { label: 'Development', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-300' },
};

export const CLIENT_PRIORITY: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'text-slate-500' },
  MEDIUM: { label: 'Medium', color: 'text-blue-500' },
  HIGH: { label: 'High', color: 'text-amber-500' },
  CRITICAL: { label: 'Critical', color: 'text-red-500' },
};

export const CLIENT_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
  ONBOARDING: { label: 'Onboarding', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-300' },
  PAUSED: { label: 'Paused', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  CHURNED: { label: 'Churned', color: 'bg-slate-400/15 text-slate-500' },
};

export const KPI_LABELS: Record<string, string> = {
  onTime: 'On-Time Delivery',
  productivity: 'Productivity',
  quality: 'Quality Approval',
  revision: 'Revision Rate',
  satisfaction: 'Client Satisfaction',
  creativity: 'Creativity',
  attendance: 'Attendance',
  collaboration: 'Collaboration',
};
