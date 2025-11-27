const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async function (req, res) {
  if (req.method === 'GET') {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
  }

  const { action, name, mobile, id, isReset, data } = req.body;

  try {
    // ADD SINGLE CUSTOMER
    if (action === 'add') {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const custId = `RK${randomId}`;
      await pool.query('INSERT INTO customers (name, mobile, customer_id) VALUES ($1, $2, $3)', [name, mobile, custId]);
      return res.status(200).json({ customerId: custId });
    }

    // UPDATE STAMPS
    if (action === 'stamp') {
      if (isReset) {
        await pool.query('UPDATE customers SET stamps = 0 WHERE customer_id = $1', [id]);
      } else {
        await pool.query('UPDATE customers SET stamps = stamps + 1 WHERE customer_id = $1', [id]);
      }
      return res.status(200).json({ message: 'Updated' });
    }

    // DELETE CUSTOMER
    if (action === 'delete') {
        await pool.query('DELETE FROM customers WHERE customer_id = $1', [id]);
        return res.status(200).json({ message: 'Deleted' });
    }

    // IMPORT CSV (Bulk Restore)
    if (action === 'import' && Array.isArray(data)) {
        for (const c of data) {
            // "ON CONFLICT DO NOTHING" ensures we don't crash if ID already exists
            // But standard SQL requires a constraint name or syntax. 
            // Simplest way for you: Check if exists, then insert.
            const check = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [c.customer_id]);
            if (check.rows.length === 0 && c.customer_id) {
                await pool.query(
                    'INSERT INTO customers (name, mobile, customer_id, stamps) VALUES ($1, $2, $3, $4)', 
                    [c.name, c.mobile, c.customer_id, c.stamps]
                );
            }
        }
        return res.status(200).json({ message: 'Import Complete!' });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
