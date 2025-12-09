const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async function (req, res) {
  // 1. GET REQUESTS
  if (req.method === 'GET') {
    try {
        // A. Customer Login
        if (req.query.action === 'login') {
            const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1 AND is_deleted = FALSE', [req.query.id]);
            if (result.rows.length === 0) return res.status(404).json({error: 'ID not found'});
            return res.status(200).json(result.rows[0]);
        }
        
        // B. History Page (Show ALL, including deleted)
        if (req.query.action === 'history') {
            const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
            return res.status(200).json(result.rows);
        }

        // C. Main Dashboard (Show only Active)
        const result = await pool.query('SELECT * FROM customers WHERE is_deleted = FALSE ORDER BY id DESC');
        return res.status(200).json(result.rows || []);
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  const { action, name, mobile, id, type, data } = req.body;

  try {
    // 2. ADD
    if (action === 'add') {
      const custId = `RK${Math.floor(1000 + Math.random() * 9000)}`;
      await pool.query('INSERT INTO customers (name, mobile, customer_id, lifetime_stamps, is_deleted) VALUES ($1, $2, $3, 0, FALSE)', [name, mobile, custId]);
      return res.status(200).json({ customerId: custId });
    }

    // 3. EDIT NAME (New)
    if (action === 'edit_name') {
        await pool.query('UPDATE customers SET name = $1 WHERE customer_id = $2', [name, id]);
        return res.status(200).json({ message: 'Name Updated' });
    }

    // 4. SOFT DELETE (Remove from main list, keep in history)
    if (action === 'soft_delete') {
      await pool.query('UPDATE customers SET is_deleted = TRUE WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Moved to History' });
    }

    // 5. PERMANENT DELETE (From History Page)
    if (action === 'permanent_delete') {
      await pool.query('DELETE FROM customers WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Permanently Deleted' });
    }

    // 6. STAMPS
    if (action === 'stamp') {
      if (type === 'reset') await pool.query('UPDATE customers SET stamps = 0, redeems = COALESCE(redeems,0) + 1 WHERE customer_id = $1', [id]);
      else if (type === 'add') await pool.query('UPDATE customers SET stamps = COALESCE(stamps,0) + 1, lifetime_stamps = COALESCE(lifetime_stamps,0) + 1 WHERE customer_id = $1', [id]);
      else if (type === 'remove') await pool.query('UPDATE customers SET stamps = GREATEST(0, COALESCE(stamps,0) - 1), lifetime_stamps = GREATEST(0, COALESCE(lifetime_stamps,0) - 1) WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Updated' });
    }
    
    // 7. IMPORT (Fixed)
    if (action === 'import' && Array.isArray(data)) {
        for (const c of data) {
            await pool.query(
                `INSERT INTO customers (name, mobile, customer_id, stamps, redeems, lifetime_stamps, is_deleted) 
                 VALUES ($1, $2, $3, $4, $5, $6, FALSE)
                 ON CONFLICT (customer_id) DO NOTHING`, 
                [c.name, c.mobile, c.customer_id, c.stamps || 0, c.redeems || 0, c.lifetime_stamps || 0]
            );
        }
        return res.status(200).json({ message: 'Batch Imported' });
    }

  } catch (err) { return res.status(500).json({ error: err.message }); }
};
