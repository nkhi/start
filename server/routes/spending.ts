import express, { Request, Response } from 'express';
import * as db from '../db.ts';
import type { DbSpendingTransaction, DbSpendingBudget } from '../db-types.ts';
import type { 
  SpendingTransaction, 
  SpendingBudget,
  UpdateSpendingTransactionRequest 
} from '../../shared/types.ts';

const router = express.Router();

/**
 * @deprecated The spending sub-application is deprecated. The client UI entry points have been removed.
 * Retained for legacy read-only access.
 */
router.get('/spending', async (req: Request, res: Response) => {
  const { month } = req.query as { month?: string }; // YYYY-MM
  if (!month) {
    return res.status(400).json({ error: 'Missing month parameter' });
  }

  try {
    const startDate = `${month}-01`;
    // Add 1 month to the date in postgres
    const result = await db.query<DbSpendingTransaction>(`
      SELECT * FROM spending_transactions 
      WHERE date >= $1::date AND date < ($1::date + interval '1 month')
      ORDER BY date ASC, created_at ASC
    `, [startDate]);

    const transactions: SpendingTransaction[] = result.rows.map(t => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      name: t.name,
      note: t.note,
      amount: parseFloat(t.amount),
      budgetId: t.budget_id,
      createdAt: t.created_at?.toISOString() || null
    }));

    // Calculate month total using postgres
    const totalResult = await db.query<{total: string}>(`
      SELECT COALESCE(SUM(amount), 0) as total FROM spending_transactions 
      WHERE date >= $1::date AND date < ($1::date + interval '1 month')
    `, [startDate]);

    const monthTotal = parseFloat(totalResult.rows[0].total);

    // Fetch budgets for this month
    const budgetResult = await db.query<DbSpendingBudget>(`
      SELECT * FROM spending_budgets WHERE month = $1
    `, [month]);

    const budgets: SpendingBudget[] = budgetResult.rows.map(b => ({
      id: b.id,
      month: b.month,
      name: b.name,
      amount: parseFloat(b.amount),
      createdAt: b.created_at?.toISOString() || null
    }));

    res.json({ transactions, monthTotal, budgets });
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * @deprecated The spending sub-application is deprecated.
 * Retained for legacy read-only access to existing anonymous budgets.
 */
router.get('/spending/budgets/anonymous', async (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  if (!month) return res.status(400).json({ error: 'Missing month parameter' });

  try {
    const result = await db.query<DbSpendingBudget>(`
      SELECT id FROM spending_budgets WHERE month = $1
    `, [month]);

    const budgetIds = result.rows.map(r => r.id);

    const anonymousBudgets = budgetIds.map((id, index) => ({
      id,
      name: `Budget ${index + 1}`,
      month,
      amount: 0,
      createdAt: null
    }));

    res.json(anonymousBudgets);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * @deprecated The spending sub-application is deprecated.
 * Retained for updating legacy transaction entries.
 */
router.patch('/spending/:id', async (req: Request<{ id: string }, object, UpdateSpendingTransactionRequest>, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;
  
  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.note !== undefined) {
    fields.push(`note = $${idx++}`);
    values.push(updates.note);
  }
  if (updates.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    values.push(updates.amount);
  }
  if (updates.date !== undefined) {
    fields.push(`date = $${idx++}`);
    values.push(updates.date);
  }
  if (updates.budgetId !== undefined) {
    fields.push(`budget_id = $${idx++}`);
    values.push(updates.budgetId);
  }
  
  if (fields.length === 0) {
    return res.json({ ok: true });
  }
  
  try {
    const result = await db.query<DbSpendingTransaction>(`
      UPDATE spending_transactions 
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const t = result.rows[0];
    const transaction: SpendingTransaction = {
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      name: t.name,
      note: t.note,
      amount: parseFloat(t.amount),
      budgetId: t.budget_id,
      createdAt: t.created_at?.toISOString() || null
    };
    
    res.json(transaction);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * @deprecated The spending sub-application is deprecated.
 * Retained for deleting legacy transaction entries.
 */
router.delete('/spending/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await db.query('DELETE FROM spending_transactions WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ ok: true });
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
