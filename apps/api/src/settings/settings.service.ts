import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULTS: Record<string, any> = {
  taskTypes: [
    'Creative', 'Video', 'Carousel', 'Ads', 'Cover', 'Branding', 'Logo', 'Brochure',
    'Presentation', 'Packaging', 'UiDesign', 'WebsiteBanner', 'SocialMedia', 'Special',
    'LandingPage', 'Illustration', 'Animation', 'Other',
  ],
  taskStatuses: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DELAYED', 'DONE', 'CANCELLED'],
  priorities: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  departments: ['Creative', 'SMM', 'SEO', 'Development', 'Sales'],
  workingHours: { start: '10:00', end: '19:00', days: [1, 2, 3, 4, 5] },
  brandAssets: [],
  permissions: {
    employee: ['dashboard', 'tasks', 'calendar', 'notifications', 'files', 'clients'],
    manager: ['*'],
  },
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.setting.findMany();
    const map: Record<string, any> = {};
    for (const r of rows) map[r.key] = r.value;
    return { ...DEFAULTS, ...map };
  }

  async get(key: string) {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row ? row.value : DEFAULTS[key] ?? null;
  }

  async set(key: string, value: any) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    });
  }

  async updateKpiWeights(weights: Record<string, number>) {
    const entries = Object.entries(weights);
    for (const [key, weight] of entries) {
      await this.prisma.kpiConfig.upsert({
        where: { key },
        create: { key, name: this.humanize(key), weight },
        update: { weight },
      });
    }
    return { success: true };
  }

  async getKpiWeights() {
    return this.prisma.kpiConfig.findMany({ orderBy: { order: 'asc' } });
  }

  private humanize(key: string) {
    const names: Record<string, string> = {
      onTime: 'On-Time Delivery',
      productivity: 'Productivity (Tasks Completed)',
      quality: 'Quality Approval Rate',
      revision: 'Revision Rate',
      satisfaction: 'Client Satisfaction',
      creativity: 'Creativity Score',
      attendance: 'Attendance',
      collaboration: 'Collaboration',
    };
    return names[key] || key;
  }
}