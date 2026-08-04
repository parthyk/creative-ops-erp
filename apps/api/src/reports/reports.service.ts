import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Period, periodRange } from '../common/utils/dates';

type Format = 'csv' | 'excel' | 'pdf';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async exportTasks(
    res: Response,
    query: {
      format?: Format;
      period?: Period;
      from?: string;
      to?: string;
      departmentId?: string;
      clientId?: string;
      employeeId?: string;
      status?: string;
      taskType?: string;
      name?: string;
    },
  ) {
    const format = query.format || 'csv';
    const { from, to } = query.from && query.to
      ? { from: new Date(query.from), to: new Date(query.to) }
      : periodRange(query.period || 'month');

    const where: Prisma.TaskWhereInput = {
      date: { gte: from, lte: to },
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.taskType ? { taskType: query.taskType as any } : {}),
    };

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        employee: { select: { name: true } },
        client: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const rows = tasks.map((t) => ({
      Date: t.date.toISOString().slice(0, 10),
      Employee: t.employee.name,
      Client: t.client?.name || 'Internal',
      Department: t.department?.name || '—',
      TaskType: t.taskType,
      TaskName: t.taskName,
      Description: t.description || '',
      Priority: t.priority,
      Status: t.status,
      'Estimated (hrs)': t.estimatedTime,
      'Actual (hrs)': t.actualTime,
      'Task Count': t.taskCount,
      'Revision Count': t.revisionCount,
      'Due Date': t.dueDate ? t.dueDate.toISOString().slice(0, 10) : '',
      'Completed At': t.completedAt ? t.completedAt.toISOString().slice(0, 10) : '',
    }));

    const filename = `tasks-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}`;
    return this.pipe(res, format, filename, rows);
  }

  async exportEmployees(
    res: Response,
    query: { format?: Format; period?: Period; from?: string; to?: string },
  ) {
    const format = query.format || 'csv';
    const { from, to } = query.from && query.to
      ? { from: new Date(query.from), to: new Date(query.to) }
      : periodRange(query.period || 'month');

    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      include: {
        department: { select: { name: true } },
        createdTasks: { where: { date: { gte: from, lte: to } } },
      },
    });

    const rows = users.map((u) => {
      const tasks = u.createdTasks;
      const done = tasks.filter((t) => t.status === 'DONE');
      const actualSum = done.reduce((s, t) => s + t.actualTime, 0);
      return {
        Name: u.name,
        Email: u.email,
        Designation: u.designation || '—',
        Department: u.department?.name || '—',
        'Joined On': u.joinedAt.toISOString().slice(0, 10),
        'Total Tasks': tasks.length,
        Completed: done.length,
        Delayed: tasks.filter((t) => t.status === 'DELAYED').length,
        'Avg Hours/Task': done.length ? Math.round((actualSum / done.length) * 10) / 10 : 0,
      };
    });

    const filename = `employees-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}`;
    return this.pipe(res, format, filename, rows);
  }

  async exportKpi(
    res: Response,
    query: { format?: Format; period?: Period },
  ) {
    const format = query.format || 'csv';
    const board = await this.prisma.user.findMany({ where: { status: 'ACTIVE' } });
    const rows = board.map((u, i) => ({
      Rank: i + 1,
      Employee: u.name,
      Department: u.departmentId || '—',
    }));

    const filename = `kpi-leaderboard-${query.period || 'month'}`;
    return this.pipe(res, format, filename, rows);
  }

  private pipe(res: Response, format: Format, filename: string, rows: Record<string, any>[]) {
    const safe = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (format === 'csv') {
      const csv = stringify(rows, { header: true });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safe}.csv"`);
      res.send(csv);
      return;
    }
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Report');
      sheet.columns = Object.keys(rows[0] || {}).map((k) => ({ header: k, key: k, width: 24 }));
      for (const r of rows) sheet.addRow(r);
      sheet.getRow(1).font = { bold: true };
      return workbook.xlsx.write(res).then(() => res.end());
    }
    // pdf
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).text('Creative Ops ERP — Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(9);
    if (rows.length) {
      const cols = Object.keys(rows[0]);
      const colW = Math.floor((doc.page.width - 72) / cols.length);
      const drawRow = (row: Record<string, any>, header: boolean) => {
        cols.forEach((c, i) => {
          const val = String(row[c] ?? '');
          doc.text(val.length > colW ? val.slice(0, colW) : val, 36 + i * colW, doc.y, {
            width: colW - 6,
            lineBreak: false,
          });
        });
        doc.y += 14;
        if (header) doc.moveDown(0.2);
      };
      drawRow(rows[0], true);
      rows.forEach((r) => drawRow(r, false));
    }
    doc.end();
  }
}
