const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async function (req, res) {
  // 1. GET REQUESTS
  if (req.method === 'GET') {
    try {
        // LOGIN (Updated: Checks ID OR Mobile)
        if (req.query.action === 'login') {
            const input = req.query.id; // This can be ID or Mobile
            const result = await pool.query(
                'SELECT * FROM customers WHERE (customer_id = $1 OR mobile = $1) AND is_deleted = FALSE', 
                [input]
            );
            
            if (result.rows.length === 0) return res.status(404).json({error: 'Account not found'});
            return res.status(200).json(result.rows[0]);
        }
        
        // HISTORY (Show All)
        if (req.query.action === 'history') {
            const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
            return res.status(200).json(result.rows || []);
        }

        // MAIN LIST (Active Only)
        const result = await pool.query('SELECT * FROM customers WHERE is_deleted = FALSE ORDER BY id DESC');
        return res.status(200).json(result.rows || []);

    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // 2. POST REQUESTS
  const { action, name, mobile, id, type, data } = req.body;

  try {
    if (action === 'add') {
      const custId = `RK${Math.floor(1000 + Math.random() * 9000)}`;
      await pool.query('INSERT INTO customers (name, mobile, customer_id, stamps, redeems, lifetime_stamps, is_deleted) VALUES ($1, $2, $3, 0, 0, 0, FALSE)', [name, mobile, custId]);
      return res.status(200).json({ customerId: custId });
    }

    if (action === 'edit_name') {
        await pool.query('UPDATE customers SET name = $1 WHERE customer_id = $2', [name, id]);
        return res.status(200).json({ message: 'Updated' });
    }

    if (action === 'soft_delete') {
      await pool.query('UPDATE customers SET is_deleted = TRUE WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Archived' });
    }

    if (action === 'permanent_delete') {
      await pool.query('DELETE FROM customers WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Deleted' });
    }

    if (action === 'stamp') {
      if (type === 'reset') await pool.query('UPDATE customers SET stamps = 0, redeems = COALESCE(redeems,0) + 1 WHERE customer_id = $1', [id]);
      else if (type === 'add') await pool.query('UPDATE customers SET stamps = COALESCE(stamps,0) + 1, lifetime_stamps = COALESCE(lifetime_stamps,0) + 1 WHERE customer_id = $1', [id]);
      else if (type === 'remove') await pool.query('UPDATE customers SET stamps = GREATEST(0, COALESCE(stamps,0) - 1), lifetime_stamps = GREATEST(0, COALESCE(lifetime_stamps,0) - 1) WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Updated' });
    }
    
    if (action === 'import' && Array.isArray(data)) {
        for (const c of data) {
            await pool.query(
                `INSERT INTO customers (name, mobile, customer_id, stamps, redeems, lifetime_stamps, is_deleted) 
                 VALUES ($1, $2, $3, $4, $5, $6, FALSE)
                 ON CONFLICT (customer_id) DO NOTHING`, 
                [c.name, c.mobile, c.customer_id, c.stamps||0, c.redeems||0, c.lifetime_stamps||0]
            );
        }
        return res.status(200).json({ message: 'Imported' });
    }

  } catch (err) { return res.status(500).json({ error: err.message }); }
};
