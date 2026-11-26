import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  PlusCircle,
  Edit2,
  Trash2,
  Wallet,
  TrendingUp,
  Calendar,
  PieChart,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchUserTrips,
  updateTrip,
} from '../services/api';
import { Trip, TripExpense, ExpenseCategory } from '../types';
import {
  PageHeader,
  SectionHeader,
  StatCard,
  EmptyState,
  LoadingSkeleton,
  ConfirmationModal,
} from '../components/ui';

const CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
  { id: 'TRANSPORTATION', label: 'Transportation', color: 'bg-sky-500' },
  { id: 'FOOD', label: 'Food & Dining', color: 'bg-emerald-500' },
  { id: 'ACCOMMODATION', label: 'Accommodation', color: 'bg-indigo-500' },
  { id: 'SHOPPING', label: 'Shopping', color: 'bg-amber-500' },
  { id: 'ACTIVITIES', label: 'Activities', color: 'bg-teal-500' },
  { id: 'EMERGENCY', label: 'Emergency', color: 'bg-red-500' },
  { id: 'OTHER', label: 'Other', color: 'bg-slate-500' },
];

export const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summary, setSummary] = useState<{
    totalSpent: number;
    count: number;
    tripBudget: number | null;
    remainingBudget: number | null;
    byCategory: Record<string, number>;
    dailyTotals: Array<{ date: string; amount: number }>;
  }>({
    totalSpent: 0,
    count: 0,
    tripBudget: null,
    remainingBudget: null,
    byCategory: {},
    dailyTotals: [],
  });
  const [loading, setLoading] = useState(true);

  const [selectedTripId, setSelectedTripId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Add / Edit Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('FOOD');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTripId, setFormTripId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Set Budget inline modal for selected trip
  const [budgetInput, setBudgetInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [expRes, tripsRes] = await Promise.all([
        fetchExpenses({ tripId: selectedTripId, category: selectedCategory }),
        fetchUserTrips(),
      ]);
      setExpenses(expRes.expenses || []);
      setSummary(expRes.summary || summary);
      setTrips(tripsRes || []);
      if (expRes.summary?.tripBudget) {
        setBudgetInput(String(expRes.summary.tripBudget));
      } else {
        setBudgetInput('');
      }
    } catch {
      showToast('Failed to load travel expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, selectedTripId, selectedCategory]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormCategory('FOOD');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTripId(selectedTripId !== 'ALL' ? selectedTripId : '');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (exp: TripExpense) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormDate(exp.expenseDate);
    setFormTripId(exp.tripId || '');
    setFormNotes(exp.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || Number(formAmount) <= 0) {
      showToast('Enter a valid expense title and positive amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        amount: Number(formAmount),
        expenseDate: formDate,
        tripId: formTripId || null,
        notes: formNotes.trim() || undefined,
      };
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
        showToast('Expense updated', 'success');
      } else {
        await createExpense(payload);
        showToast('Expense logged', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to save expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteId);
      showToast('Expense deleted', 'info');
      setDeleteId(null);
      loadData();
    } catch {
      showToast('Failed to delete expense', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateTripBudget = async () => {
    if (selectedTripId === 'ALL' || !budgetInput) return;
    setSavingBudget(true);
    try {
      await updateTrip(selectedTripId, { totalBudget: Number(budgetInput) });
      showToast('Trip budget updated', 'success');
      loadData();
    } catch {
      showToast('Failed to update budget', 'error');
    } finally {
      setSavingBudget(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={Lock}
          title="Sign in to track travel expenses"
          description="Keep daily spending, trip budgets, and category breakdowns safely synced to your account."
          accentColor="blue"
        />
      </div>
    );
  }

  const maxCategoryAmount = Math.max(
    1,
    ...CATEGORIES.map((c) => summary.byCategory[c.id] || 0)
  );
  const maxDailyAmount = Math.max(
    1,
    ...summary.dailyTotals.map((d) => d.amount)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16 yg-page-enter">
      <PageHeader
        eyebrow="Budget & Spend Control"
        icon={Wallet}
        accentColor="teal"
        title="Travel Expense Tracker"
        description="Track daily trip spending, monitor category breakdowns, and stay within your trip budget."
        actions={
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 keep-white yg-press"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Add Expense</span>
          </button>
        }
      />

      {/* Filter Bar + Trip Budget Setter */}
      <div className="yg-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            aria-label="Filter by trip"
            className="rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
          >
            <option value="ALL">All Trips &amp; Standalone</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.destinationCity})
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {selectedTripId !== 'ALL' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Trip Budget (₹):</span>
            <input
              type="number"
              min={0}
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="e.g. 10000"
              className="w-28 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
            <button
              type="button"
              disabled={savingBudget}
              onClick={handleUpdateTripBudget}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold keep-white"
            >
              {savingBudget ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
        )}
      </div>

      {/* Stat Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenditure"
          value={`₹${summary.totalSpent.toLocaleString('en-IN')}`}
          subtext={`${summary.count} logged expense(s)`}
          icon={IndianRupee}
          accentColor="blue"
        />
        <StatCard
          title="Trip Budget"
          value={
            summary.tripBudget !== null
              ? `₹${summary.tripBudget.toLocaleString('en-IN')}`
              : 'Not Set'
          }
          subtext={selectedTripId === 'ALL' ? 'Select a trip to set budget' : 'Allocated trip cap'}
          icon={Wallet}
          accentColor="teal"
        />
        <StatCard
          title="Remaining Budget"
          value={
            summary.remainingBudget !== null
              ? `₹${summary.remainingBudget.toLocaleString('en-IN')}`
              : '—'
          }
          subtext={
            summary.remainingBudget !== null && summary.remainingBudget < 0
              ? 'Over budget!'
              : 'Available balance'
          }
          icon={TrendingUp}
          accentColor={
            summary.remainingBudget !== null && summary.remainingBudget < 0 ? 'red' : 'emerald'
          }
        />
        <StatCard
          title="Active Days Tracked"
          value={summary.dailyTotals.length}
          subtext="Days with recorded spend"
          icon={Calendar}
          accentColor="amber"
        />
      </div>

      {/* Visual Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown */}
        <div className="yg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              Category Breakdown
            </h3>
          </div>
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const val = summary.byCategory[cat.id] || 0;
              const pct = summary.totalSpent > 0 ? Math.round((val / summary.totalSpent) * 100) : 0;
              const barWidth = Math.round((val / maxCategoryAmount) * 100);
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {cat.label}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{val.toLocaleString('en-IN')} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${cat.color}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Expense Chart */}
        <div className="yg-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            Daily Spend Trend
          </h3>

          {summary.dailyTotals.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
              Log your first expense to see daily spending totals.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {summary.dailyTotals.map((day) => {
                const barWidth = Math.round((day.amount / maxDailyAmount) * 100);
                return (
                  <div key={day.date} className="flex items-center gap-3 text-xs">
                    <span className="w-24 text-slate-500 dark:text-slate-400 font-mono flex-shrink-0">
                      {day.date}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-600 dark:bg-sky-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-bold text-slate-900 dark:text-white flex-shrink-0">
                      ₹{day.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expense History */}
      <section className="space-y-4">
        <SectionHeader
          title="Expense History"
          subtitle="Click edit or delete on any entry to adjust your ledger."
        />

        {loading ? (
          <LoadingSkeleton variant="list" count={4} />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses recorded"
            description="Start logging transport, meals, stays, or activity costs to track your trip budget."
            actionLabel="Add First Expense"
            onAction={openAddModal}
            accentColor="teal"
          />
        ) : (
          <div className="space-y-2.5">
            {expenses.map((exp) => {
              const catInfo = CATEGORIES.find((c) => c.id === exp.category) || CATEGORIES[6];
              return (
                <div
                  key={exp.id}
                  className="yg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-2.5 h-10 rounded-full flex-shrink-0 ${catInfo.color}`} />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {exp.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {catInfo.label}
                        </span>
                        {exp.trip && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                            {exp.trip.destinationCity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {exp.expenseDate}
                        {exp.notes ? ` • ${exp.notes}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(exp)}
                        aria-label={`Edit ${exp.title}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(exp.id)}
                        aria-label={`Delete ${exp.title}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/50 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveExpense}
            className="yg-card w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingExpense ? 'Edit Expense' : 'Add Travel Expense'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Prepaid auto to Taj East Gate"
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="250"
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Link to Trip
                  </label>
                  <select
                    value={formTripId}
                    onChange={(e) => setFormTripId(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="">None (Standalone)</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional receipt or payment note"
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold keep-white disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingExpense ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteId)}
        title="Delete expense entry?"
        description="This entry will be removed from your trip budget totals."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
