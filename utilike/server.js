require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '6mb' }));

const SENHA = process.env.ADMIN_PASSWORD;
const SEGREDO = process.env.SESSION_SECRET || SENHA || 'dev';
const ARQUIVO = path.join(__dirname, 'data.json'); // usado só se não houver UTILIKE_DATABASE_URL (teste local)
const VAZIO = { config: { nomeLoja: 'Utilike', instagram: '', tiktok: '', youtube: '', whatsapp: '', loja: '', perfil: '' }, produtos: [] };

let pool = null;
if (process.env.UTILIKE_DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.UTILIKE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

async function iniciarBanco() {
  if (pool) await pool.query('CREATE TABLE IF NOT EXISTS kv (chave TEXT PRIMARY KEY, valor JSONB NOT NULL)');
}
async function ler() {
  if (pool) {
    const r = await pool.query("SELECT valor FROM kv WHERE chave = 'site'");
    return r.rows[0] ? r.rows[0].valor : VAZIO;
  }
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch (e) { return VAZIO; }
}
async function gravar(dados) {
  if (pool) {
    await pool.query("INSERT INTO kv (chave, valor) VALUES ('site', $1) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor", [JSON.stringify(dados)]);
  } else {
    fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
  }
}

/* ---- Login por token assinado (vale 12 horas) ---- */
const assinar = (t) => crypto.createHmac('sha256', SEGREDO).update(t).digest('hex');
const criarToken = () => { const e = String(Date.now() + 12 * 3600 * 1000); return e + '.' + assinar(e); };
function tokenValido(tk) {
  if (!tk) return false;
  const [e, s] = tk.split('.');
  if (!e || !s || Number(e) < Date.now()) return false;
  const a = Buffer.from(assinar(e)), b = Buffer.from(s);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const exigirLogin = (req, res, next) =>
  tokenValido((req.headers.authorization || '').replace('Bearer ', '')) ? next() : res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });

app.post('/api/login', async (req, res) => {
  if (!SENHA) return res.status(500).json({ erro: 'ADMIN_PASSWORD não está configurada no servidor.' });
  const a = Buffer.from(String((req.body || {}).senha || '')), b = Buffer.from(SENHA);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) { await new Promise((r) => setTimeout(r, 1000)); return res.status(401).json({ erro: 'Senha incorreta.' }); }
  res.json({ token: criarToken() });
});

app.get('/api/dados', async (req, res) => {
  try { res.set('Cache-Control', 'no-store'); res.json(await ler()); }
  catch (e) { console.error(e); res.status(500).json({ erro: 'Erro ao ler os dados.' }); }
});

app.put('/api/dados', exigirLogin, async (req, res) => {
  try {
    const { config, produtos } = req.body || {};
    if (typeof config !== 'object' || !Array.isArray(produtos)) return res.status(400).json({ erro: 'Dados inválidos.' });
    await gravar({ config, produtos });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro ao salvar.' }); }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORTA = process.env.PORT || 3000;
iniciarBanco()
  .then(() => app.listen(PORTA, () => console.log('Utilike no ar: http://localhost:' + PORTA + (pool ? ' (banco Neon)' : ' (arquivo local data.json)'))))
  .catch((e) => { console.error('Falha ao conectar no banco:', e.message); process.exit(1); });
