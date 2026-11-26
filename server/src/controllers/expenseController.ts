import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const EXPENSE_CATEGORIES = [
  'TRANSPORTATION',
  'FOOD',
  'ACCOMMODATION',
  'SHOPPING',
  'ACTIVITIES',
  'EMERGENCY',
  'OTHER',
] as const;

export async function getExpenses(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { tripId, category, startDate, endDate } = req.query;
    const where: any = { userId: req.user.id };

    if (tripId && typeof tripId === 'string' && tripId !== 'ALL') {
      where.tripId = tripId;
    }
    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }
    if (startDate && typeof startDate === 'string') {
      where.expenseDate = { ...(where.expenseDate || {}), gte: startDate };
    }
    if (endDate && typeof endDate === 'string') {
      where.expenseDate = { ...(where.expenseDate || {}), lte: endDate };
    }

    const expenses = await prisma.tripExpense.findMany({
      where,
      include: {
        trip: { select: { id: true, title: true, destinationCity: true, totalBudget: true } },
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      byCategory[cat] = 0;
    });
    const dailyTotalsMap: Record<string, number> = {};

    for (const exp of expenses) {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
      dailyTotalsMap[exp.expenseDate] = (dailyTotalsMap[exp.expenseDate] || 0) + exp.amount;
    }

    const dailyTotals = Object.entries(dailyTotalsMap)
      .map(([date, amount]) => ({ date, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let tripBudget: number | null = null;
    if (tripId && typeof tripId === 'string' && tripId !== 'ALL') {
      const trip = await prisma.trip.findFirst({
        where: { id: tripId, userId: req.user.id },
        select: { totalBudget: true },
      });
      tripBudget = trip?.totalBudget ?? null;
    }

    const remainingBudget =
      tripBudget !== null ? Number((tripBudget - totalSpent).toFixed(2)) : null;

    return res.json({
      expenses,
      summary: {
        totalSpent: Number(totalSpent.toFixed(2)),
        count: expenses.length,
        tripBudget,
        remainingBudget,
        byCategory,
        dailyTotals,
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({ error: 'Failed to retrieve travel expenses' });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, category, amount, expenseDate, tripId, notes, currency = 'INR' } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Expense title is required' });
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid expense category' });
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip || trip.userId !== req.user.id) {
        return res.status(403).json({ error: 'Selected trip not found or unauthorized' });
      }
    }

    const expense = await prisma.tripExpense.create({
      data: {
        userId: req.user.id,
        tripId: tripId || null,
        title: title.trim(),
        category,
        amount: Number(numAmount.toFixed(2)),
        currency,
        expenseDate: expenseDate || new Date().toISOString().split('T')[0],
        notes: notes?.trim() || null,
      },
      include: {
        trip: { select: { id: true, title: true, destinationCity: true, totalBudget: true } },
      },
    });

    return res.status(201).json({ message: 'Expense added', expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return res.status(500).json({ error: 'Failed to add expense' });
  }
}

export async function updateExpense(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const existing = await prisma.tripExpense.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this expense' });
    }

    const { title, category, amount, expenseDate, tripId, notes } = req.body;

    if (category !== undefined && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid expense category' });
    }
    if (amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip || trip.userId !== req.user.id) {
        return res.status(403).json({ error: 'Selected trip not found or unauthorized' });
      }
    }

    const updated = await prisma.tripExpense.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { amount: Number(Number(amount).toFixed(2)) }),
        ...(expenseDate !== undefined && { expenseDate }),
        ...(tripId !== undefined && { tripId: tripId || null }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
      },
      include: {
        trip: { select: { id: true, title: true, destinationCity: true, totalBudget: true } },
      },
    });

    return res.json({ message: 'Expense updated', expense: updated });
  } catch (error) {
    console.error('Update expense error:', error);
    return res.status(500).json({ error: 'Failed to update expense' });
  }
}

export async function deleteExpense(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const existing = await prisma.tripExpense.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this expense' });
    }

    await prisma.tripExpense.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
}
