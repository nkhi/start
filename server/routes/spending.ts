import express, { Request, Response } from 'express';
import * as db from '../db.ts';
import type { DbSpendingTransaction, DbSpendingBudget } from '../db-types.ts';
import type { 
  SpendingTransaction, 
  SpendingBudget,
  CreateSpendingTransactionRequest, 
  UpdateSpendingTransactionRequest 
} from '../../shared/types.ts';
import crypto from 'crypto';

const router = express.Router();

// Get transactions for a month
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

    let budgets: SpendingBudget[] = budgetResult.rows.map(b => ({
      id: b.id,
      month: b.month,
      name: b.name,
      amount: parseFloat(b.amount),
      createdAt: b.created_at?.toISOString() || null
    }));

    // Auto-create default budget if none exist
    if (budgets.length === 0) {
      const defaultId = crypto.randomUUID();
      const defaultAmount = 400.00;
      await db.query(`
        INSERT INTO spending_budgets (id, month, name, amount)
        VALUES ($1, $2, $3, $4)
      `, [defaultId, month, 'Fun', defaultAmount]);

      budgets.push({
        id: defaultId,
        month,
        name: 'Fun',
        amount: defaultAmount,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ transactions, monthTotal, budgets });
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
router.post('/spending', async (req: Request<object, object, CreateSpendingTransactionRequest>, res: Response) => {
  const { id, date, name, note, amount, budgetId } = req.body;
  if (!id || !date || !name || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const createdAt = new Date().toISOString();
    await db.query(`
      INSERT INTO spending_transactions (id, date, name, note, amount, budget_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, date, name, note || null, amount, budgetId || null, createdAt]);
    
    const transaction: SpendingTransaction = {
      id, date, name, note: note || null, amount, budgetId: budgetId || null, createdAt
    };
    res.json(transaction);
  } catch (e) {
    const error = e as Error;
    res.status(500).json({ error: error.message });
  }
});

// Update transaction
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

// Delete transaction
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
