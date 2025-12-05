const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
module.exports = async function (req, res) {
  if (req.method === 'GET') {
    if (req.query.action === 'login') {
        const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.query.id]);
        if (result.rows.length === 0) return res.status(404).json({error: 'Not found'});
        return res.status(200).json(result.rows[0]);
    }
    const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    return res.status(200).json(result.rows || []);
  }
  const { action, name, mobile, id, type } = req.body;
  try {
    if (action === 'add') {
      const custId = `RK${Math.floor(1000 + Math.random() * 9000)}`;
      await pool.query('INSERT INTO customers (name, mobile, customer_id, redeems) VALUES ($1, $2, $3, 0)', [name, mobile, custId]);
      return res.status(200).json({ customerId: custId });
    }
    if (action === 'stamp') {
      if (type === 'reset') await pool.query('UPDATE customers SET stamps = 0, redeems = COALESCE(redeems,0) + 1 WHERE customer_id = $1', [id]);
      else if (type === 'add') await pool.query('UPDATE customers SET stamps = COALESCE(stamps,0) + 1 WHERE customer_id = $1', [id]);
      else if (type === 'remove') await pool.query('UPDATE customers SET stamps = GREATEST(0, COALESCE(stamps,0) - 1) WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Updated' });
    }
    if (action === 'delete') {
      await pool.query('DELETE FROM customers WHERE customer_id = $1', [id]);
      return res.status(200).json({ message: 'Deleted' });
    }
  } catch (err) { return res.status(500).json({ error: err.message }); }
};
