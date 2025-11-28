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

  const { action, name, mobile, id, isReset, data, password } = req.body;

  try {
    if (action === 'add') {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const custId = `RK${randomId}`;
      await pool.query('INSERT INTO customers (name, mobile, customer_id) VALUES ($1, $2, $3)', [name, mobile, custId]);
      return res.status(200).json({ customerId: custId });
    }

    if (action === 'stamp') {
      if (isReset) {
        await pool.query('UPDATE customers SET stamps = 0 WHERE customer_id = $1', [id]);
      } else {
        await pool.query('UPDATE customers SET stamps = stamps + 1 WHERE customer_id = $1', [id]);
      }
      return res.status(200).json({ message: 'Updated' });
    }

    // --- SECURE DELETE CHECK ---
    if (action === 'delete') {
        // Verify password against Admin table
        const authCheck = await pool.query('SELECT * FROM admins WHERE password = $1', [password]);
        
        if (authCheck.rows.length === 0) {
            return res.status(401).json({ error: 'WRONG PASSWORD! Deletion Denied.' });
        }

        await pool.query('DELETE FROM customers WHERE customer_id = $1', [id]);
        return res.status(200).json({ message: 'Deleted Successfully' });
    }

    if (action === 'import' && Array.isArray(data)) {
        for (const c of data) {
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
