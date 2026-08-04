import { PrismaClient, Role, TaskType, TaskStatus, Priority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// deterministic PRNG
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TASK_TYPES: TaskType[] = [
  'Creative', 'Video', 'Carousel', 'Ads', 'Cover', 'Branding', 'Logo', 'Brochure',
  'Presentation', 'Packaging', 'UiDesign', 'WebsiteBanner', 'SocialMedia', 'Special',
  'LandingPage', 'Illustration', 'Animation',
];
const STATUSES: TaskStatus[] = ['DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'IN_PROGRESS', 'TODO', 'IN_REVIEW', 'DELAYED'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT'];

const NAME_POOL = [
  'Social media calendar', 'Client pitch deck', 'Product video teaser', 'Logo refresh concepts',
  'Website hero banner', 'Packaging dieline', 'Instagram carousel', 'Brand guidelines v2',
  'E-commerce landing page', 'Campaign ad set', 'Brand illustration set', 'Brochure redesign',
  'Monthly report design', 'Animation storyboard', 'Mobile app UI', 'Festive offer creatives',
  'Newsletter template', 'Case study PDF', 'YouTube thumbnail pack', 'Trade show banner',
];

async function main() {
  console.log('🌱 Seeding database...');

  // ---------- Departments ----------
  const deps: Record<string, string> = {};
  const depData: { name: string; color: string; description: string }[] = [
    { name: 'Creative', color: '#8b5cf6', description: 'Design, illustration, branding' },
    { name: 'SMM', color: '#ec4899', description: 'Social media management' },
    { name: 'SEO', color: '#22c55e', description: 'Search optimisation' },
    { name: 'Development', color: '#3b82f6', description: 'Web & app development' },
    { name: 'Sales', color: '#f59e0b', description: 'Sales & account growth' },
  ];
  for (const d of depData) {
    const dep = await prisma.department.upsert({ where: { name: d.name }, create: d, update: {} });
    deps[d.name] = dep.id;
  }

  // ---------- Users ----------
  const hash = await bcrypt.hash('Admin@123', 10);
  const empHash = await bcrypt.hash('Pass@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@onedot.com' },
    create: {
      email: 'admin@onedot.com', password: hash, name: 'Vikram Raj',
      role: Role.MANAGER, designation: 'Creative Director', departmentId: deps['Creative'],
      isApprover: true, status: 'ACTIVE',
    },
    update: {},
  });

  const employees: any[] = [
    { name: 'Sathiya', email: 'sathiya@onedot.com', department: 'Creative', designation: 'Sr. Graphic Designer' },
    { name: 'Sneha', email: 'sneha@onedot.com', department: 'Creative', designation: 'Motion Designer' },
    { name: 'Robin', email: 'robin@onedot.com', department: 'Creative', designation: 'Brand Designer' },
    { name: 'Priya', email: 'priya@onedot.com', department: 'SMM', designation: 'Social Media Executive' },
    { name: 'Karthik', email: 'karthik@onedot.com', department: 'SEO', designation: 'SEO Specialist' },
    { name: 'Meera', email: 'meera@onedot.com', department: 'Development', designation: 'Frontend Developer' },
    { name: 'Arjun', email: 'arjun@onedot.com', department: 'Sales', designation: 'Account Executive' },
  ];
  const userIds: Record<string, string> = {};
  for (const e of employees) {
    const u = await prisma.user.upsert({
      where: { email: e.email },
      create: {
        email: e.email, password: empHash, name: e.name, role: Role.EMPLOYEE,
        designation: e.designation, departmentId: deps[e.department], status: 'ACTIVE',
        workingHoursPerDay: 8,
      },
      update: {},
    });
    userIds[e.name] = u.id;
    console.log(`  ✓ ${e.name} (${e.email})`);
  }
  console.log(`  ✓ Admin ${admin.email}`);

  // ---------- Clients ----------
  const clientsData = [
    { name: 'AMM Aqua', industry: 'Bottled Water', website: 'ammaqua.com', contractType: 'RETAINER', priority: 'HIGH', status: 'ACTIVE', brandColors: { primary: '#0ea5e9', secondary: '#38bdf8', accent: '#0284c7' }, fonts: ['Montserrat', 'Open Sans'] },
    { name: 'Corroshields', industry: 'Industrial Coatings', website: 'corroshields.com', contractType: 'RETAINER', priority: 'CRITICAL', status: 'ACTIVE', brandColors: { primary: '#1e3a5f', secondary: '#f97316', accent: '#0f172a' }, fonts: ['Inter', 'Barlow'] },
    { name: 'OneDot Health', industry: 'Healthcare', website: 'onedothealth.in', contractType: 'PROJECT', priority: 'MEDIUM', status: 'ACTIVE', brandColors: { primary: '#16a34a', secondary: '#86efac', accent: '#14532d' }, fonts: ['Lato', 'Poppins'] },
    { name: 'Zara Fitwear', industry: 'Fitness Apparel', website: 'zarafitwear.com', contractType: 'RETAINER', priority: 'HIGH', status: 'ACTIVE', brandColors: { primary: '#e11d48', secondary: '#fecdd3', accent: '#4c0519' }, fonts: ['Oswald', 'Montserrat'] },
    { name: 'Nova Bites', industry: 'Food & Beverage', website: 'novabites.food', contractType: 'PROJECT', priority: 'MEDIUM', status: 'ONBOARDING', brandColors: { primary: '#a16207', secondary: '#fde047', accent: '#713f12' }, fonts: ['Nunito', 'Comfortaa'] },
  ];
  const clientIds: Record<string, string> = {};
  for (const c of clientsData as any[]) {
    let slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await prisma.client.findUnique({ where: { slug } });
    const client = existing
      ? await prisma.client.update({ where: { slug }, data: c })
      : await prisma.client.create({ data: { ...c, slug } });
    clientIds[c.name] = client.id;
  }

  // ---------- Stakeholders ----------
  const stakeholderMap: [string, string, string][] = [
    ['AMM Aqua', 'CREATIVE', 'Sneha'],
    ['AMM Aqua', 'SMM', 'Priya'],
    ['AMM Aqua', 'SEO', 'Karthik'],
    ['AMM Aqua', 'SALES', 'Arjun'],
    ['Corroshields', 'CREATIVE', 'Sathiya'],
    ['Corroshields', 'SMM', 'Priya'],
    ['Corroshields', 'DEVELOPMENT', 'Meera'],
    ['OneDot Health', 'CREATIVE', 'Robin'],
    ['OneDot Health', 'DEVELOPMENT', 'Meera'],
    ['Zara Fitwear', 'CREATIVE', 'Sathiya'],
    ['Zara Fitwear', 'SMM', 'Priya'],
    ['Nova Bites', 'CREATIVE', 'Robin'],
  ];
  for (const [clientName, role, empName] of stakeholderMap) {
    const empId = userIds[empName];
    await prisma.stakeholder.upsert({
      where: { clientId_role: { clientId: clientIds[clientName], role: role as any } },
      create: { clientId: clientIds[clientName], role: role as any, employeeId: empId, isActive: true },
      update: { employeeId: empId, isActive: true },
    });
  }

  // ---------- Tasks (last 90 days) ----------
  const rng = mulberry32(42);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const clients = Object.entries(clientIds);
  let taskCount = 0;

  for (const [empName, empId] of Object.entries(userIds)) {
    const deptId = deps[employees.find((e) => e.name === empName)?.department || 'Creative'];
    for (let d = 89; d >= 0; d--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue; // weekends off

      const numTasks = Math.floor(rng() * 3.2) + (d < 2 ? 1 : 0);
      for (let i = 0; i < numTasks; i++) {
        const [clientName, clientId] = clients[Math.floor(rng() * clients.length)];
        const isDone = d > 2 ? rng() < 0.68 : rng() < 0.35;
        const isDelayed = !isDone && rng() < 0.28;
        const status: TaskStatus = isDone ? 'DONE' : isDelayed ? 'DELAYED' : STATUSES[Math.floor(rng() * 4)];
        const estimatedTime = Math.round((rng() * 4 + 0.5) * 2) / 2;
        const actualTime = status === 'DONE' ? Math.round((estimatedTime * (0.7 + rng() * 0.9)) * 2) / 2 : 0;
        const completedAt = status === 'DONE' ? new Date(date.getTime() + Math.floor(rng() * 10) * 3600000) : null;
        const revisionCount = status === 'DONE' ? (rng() < 0.55 ? 0 : Math.floor(rng() * 3)) : 0;
        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + (rng() < 0.5 ? 1 : 2));

        await prisma.task.create({
          data: {
            date,
            dueDate,
            taskType: TASK_TYPES[Math.floor(rng() * TASK_TYPES.length)],
            taskName: NAME_POOL[Math.floor(rng() * NAME_POOL.length)],
            description: `Seeded task for ${clientName} — generated demo data.`,
            priority: PRIORITIES[Math.floor(rng() * PRIORITIES.length)],
            status,
            estimatedTime,
            actualTime,
            taskCount: Math.floor(rng() * 3) + 1,
            revisionCount,
            completedAt,
            clientId,
            departmentId: deptId,
            employeeId: empId,
            assignedById: admin.id,
          },
        });
        taskCount++;
      }
    }
  }
  console.log(`  ✓ ${taskCount} tasks`);

  // ---------- Attendance (last 60 days) ----------
  let attCount = 0;
  for (const empId of Object.values(userIds)) {
    for (let d = 59; d >= 0; d--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      const roll = rng();
      const status = roll < 0.9 ? 'PRESENT' : roll < 0.95 ? 'ABSENT' : 'HALF_DAY';
      const checkIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9 + Math.floor(rng() * 2), 30);
      const checkOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18 + Math.floor(rng() * 2), 0);
      const hours = Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 10) / 10;
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: empId, date } },
        create: { employeeId: empId, date, status: status as any, checkIn, checkOut, hoursWorked: hours },
        update: {},
      });
      attCount++;
    }
  }
  console.log(`  ✓ ${attCount} attendance records`);

  // ---------- Leaves ----------
  const leaves = [
    { employee: 'Priya', start: 6, end: 8, type: 'CASUAL', status: 'APPROVED' },
    { employee: 'Karthik', start: 15, end: 16, type: 'SICK', status: 'PENDING' },
    { employee: 'Robin', start: 25, end: 27, type: 'EARNED', status: 'APPROVED' },
  ];
  for (const l of leaves) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - l.start);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - l.end);
    await prisma.leave.create({
      data: {
        employeeId: userIds[l.employee],
        startDate: start,
        endDate: end,
        type: l.type as any,
        status: l.status as any,
        reason: 'Seeded leave request',
        approvedById: l.status === 'APPROVED' ? admin.id : null,
        approvedAt: l.status === 'APPROVED' ? new Date() : null,
      },
    });
  }

  // ---------- Holidays ----------
  await prisma.holiday.deleteMany({});
  const holidays = [
    { name: 'New Year', date: new Date(today.getFullYear(), 0, 1) },
    { name: 'Republic Day', date: new Date(today.getFullYear(), 0, 26) },
    { name: 'Independence Day', date: new Date(today.getFullYear(), 7, 15) },
    { name: 'Diwali', date: new Date(today.getFullYear(), 10, 14) },
    { name: 'Christmas', date: new Date(today.getFullYear(), 11, 25) },
  ];
  for (const h of holidays) await prisma.holiday.create({ data: h });

  // ---------- KPI config ----------
  const kpis = [
    { key: 'onTime', name: 'On-Time Delivery', weight: 25, order: 1 },
    { key: 'productivity', name: 'Productivity (Tasks Completed)', weight: 20, order: 2 },
    { key: 'quality', name: 'Quality Approval Rate', weight: 20, order: 3 },
    { key: 'revision', name: 'Revision Rate (Lower Better)', weight: 10, order: 4 },
    { key: 'satisfaction', name: 'Client Satisfaction', weight: 10, order: 5 },
    { key: 'creativity', name: 'Creativity Score', weight: 5, order: 6 },
    { key: 'attendance', name: 'Attendance', weight: 5, order: 7 },
    { key: 'collaboration', name: 'Collaboration', weight: 5, order: 8 },
  ];
  for (const k of kpis) {
    await prisma.kpiConfig.upsert({ where: { key: k.key }, create: k, update: { weight: k.weight, name: k.name } });
  }

  // ---------- Settings defaults ----------
  const settings: Record<string, any> = {
    taskTypes: [...TASK_TYPES],
    taskStatuses: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DELAYED', 'DONE', 'CANCELLED'],
    priorities: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    departments: depData.map((d) => d.name),
    workingHours: { start: '10:00', end: '19:00', days: [1, 2, 3, 4, 5] },
    brandAssets: [],
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  // ---------- Activities ----------
  const now = new Date();
  const recentTasks = await prisma.task.findMany({ include: { client: { select: { name: true } }, employee: { select: { name: true } } }, orderBy: { date: 'desc' }, take: 25 });
  for (const t of recentTasks) {
    await prisma.activity.create({
      data: {
        userId: t.employeeId,
        userName: t.employee.name,
        action: t.status === 'DONE' ? 'completed a task' : 'updated a task',
        entityType: 'Task',
        entityId: t.id,
        meta: { task: t.taskName, client: t.client?.name, status: t.status },
        createdAt: new Date(Math.min(now.getTime(), (t.date.getTime() + 6 * 3600000))),
      },
    });
  }

  console.log('✅ Seed complete');
  console.log('\nDemo logins:');
  console.log('  Management:  admin@onedot.com / Admin@123');
  console.log('  Employee:    sneha@onedot.com / Pass@123');
  console.log('               sathiya@onedot.com / Pass@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
