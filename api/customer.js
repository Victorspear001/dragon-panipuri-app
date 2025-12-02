const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async function (req, res) {
  // 1. LIST & LOGIN
  if (req.method === 'GET') {
    try {
        if (req.query.action === 'login') {
            const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.query.id]);
            if (result.rows.length === 0) return res.status(404).json({error: 'Not found'});
            return res.status(200).json(result.rows[0]);
        }
        const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
        return res.status(200).json(result.rows);
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  const { action, name, mobile, id, type, data } = req.body;

  try {
    // 2. ADD CUSTOMER
    if (action === 'add') {
      const custId = `RK${Math.floor(1000 + Math.random() * 9000)}`;
      await pool.query('INSERT INTO customers (name, mobile, customer_id, lifetime_stamps) VALUES ($1, $2, $3, 0)', [name, mobile, custId]);
      return res.status(200).json({ customerId: custId });
    }

    // 3. STAMPS
    if (action === 'stamp') {
      if (type === 'reset') {
        await pool.query('UPDATE customers SET stamps = 0 WHERE customer_id = $1', [id]);
      } 
      else if (type === 'add') {
        await pool.query('UPDATE customers SET stamps = stamps + 1, lifetime_stamps = COALESCE(lifetime_stamps, 0) + 1 WHERE customer_id = $1', [id]);
      }
      else if (type === 'remove') {
        await pool.query('UPDATE customers SET stamps = GREATEST(0, stamps - 1), lifetime_stamps = GREATEST(0, lifetime_stamps - 1) WHERE customer_id = $1', [id]);
      }
      return res.status(200).json({ message: 'Updated' });
    }

    // 4. DELETE
    if (action === 'delete') {
      await pool.query('DELETE FROM customers WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Deleted' });
    }
    
    // 5. IMPORT BATCH (CRITICAL UPDATE)
    if (action === 'import' && Array.isArray(data)) {
        // We iterate and insert. 
        // Note: For huge scale, a single bulk INSERT query is better, but loop is safer for simple implementation.
        for (const c of data) {
            // "ON CONFLICT" prevents crashes on duplicate IDs
            await pool.query(
                `INSERT INTO customers (name, mobile, customer_id, stamps, lifetime_stamps) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (customer_id) DO NOTHING`, 
                [c.name, c.mobile, c.customer_id, c.stamps, c.lifetime_stamps]
            );
        }
        return res.status(200).json({ message: 'Batch Imported' });
    }

  } catch (err) { return res.status(500).json({ error: err.message }); }
};
