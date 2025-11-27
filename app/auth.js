import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const { action, user, pass, q, a, newPass } = req.body;

  try {
    if (action === 'register') {
      await pool.query('INSERT INTO admins (username, password, security_question, security_answer) VALUES ($1, $2, $3, $4)', [user, pass, q, a]);
      return res.status(200).json({ message: 'Admin Registered' });
    } 
    
    else if (action === 'login') {
      const result = await pool.query('SELECT * FROM admins WHERE username = $1 AND password = $2', [user, pass]);
      if (result.rows.length > 0) return res.status(200).json({ message: 'Success' });
      return res.status(401).json({ error: 'Fail' });
    }

    else if (action === 'recover') {
        const result = await pool.query('SELECT * FROM admins WHERE username = $1 AND security_question = $2 AND security_answer = $3', [user, q, a]);
        if (result.rows.length > 0) {
            await pool.query('UPDATE admins SET password = $1 WHERE username = $2', [newPass, user]);
            return res.status(200).json({ message: 'Password Updated' });
        }
        return res.status(401).json({ error: 'Security checks failed' });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
