// Demo mode: the whole app runs in the browser against fictitious data.
// window.fetch is wrapped so /api/* requests never reach the server. Changes live in
// sessionStorage and disappear when the tab closes or the visitor leaves the demo.
import { getLang } from './i18n';
import { dayKey, shiftDay } from './day-plan';

export const DEMO_FLAG = 'luden-demo';
const STORE_KEY = 'luden-demo-store-v1';
type Row = Record<string, unknown> & { id?: string };
type Store = { tables: Record<string, Row[]>; blocks: Row[]; done: Row[]; changes: Row[]; items: Row[]; events: Row[]; revision: number };

export function demoActive() {
  try { return typeof window !== 'undefined' && window.sessionStorage.getItem(DEMO_FLAG) === '1'; } catch { return false; }
}
export function startDemo() {
  try { sessionStorage.setItem(DEMO_FLAG, '1'); sessionStorage.removeItem(STORE_KEY); sessionStorage.setItem('aurum-profile', JSON.stringify({ id: 'demo', name: 'Demo' })); } catch { /* ignore */ }
}
export function leaveDemo() {
  try { sessionStorage.removeItem(DEMO_FLAG); sessionStorage.removeItem(STORE_KEY); sessionStorage.removeItem('aurum-profile'); } catch { /* ignore */ }
}

const uid = () => crypto.randomUUID();
const L = (es: string, en: string) => getLang() === 'en' ? en : es;

function seed(): Store {
  const today = dayKey(), now = new Date().toISOString();
  const month = today.slice(0, 7), prev = shiftDay(month + '-01', -1).slice(0, 7);
  const bank = uid(), cash = uid(), savings = uid(), tillBank = uid(), tillCash = uid();
  const accounts: Row[] = [
    { id: bank, name: L('Banco', 'Bank'), kind: 'Banco', opening_balance: 1850, scope: 'personal' },
    { id: cash, name: L('Efectivo', 'Cash'), kind: 'Efectivo', opening_balance: 120, scope: 'personal' },
    { id: savings, name: L('Ahorro', 'Savings'), kind: 'Ahorro', opening_balance: 2400, scope: 'personal' },
    { id: tillBank, name: L('Banco Caja', 'Till bank'), kind: 'Banco', opening_balance: 300, scope: 'business' },
    { id: tillCash, name: L('Efectivo Caja', 'Till cash'), kind: 'Efectivo', opening_balance: 60, scope: 'business' },
  ];
  const tx = (days: number, title: string, category: string, amount: number, type: string, account = bank, extra: Row = {}): Row => ({ id: uid(), created_at: now, title, category, amount, type, account_id: account, destination_account_id: null, savings_month: null, date: shiftDay(today, -days), micro: false, ...extra });
  const transactions: Row[] = [
    tx(0, L('Compra semanal', 'Weekly groceries'), 'Supermercado', 64.35, 'gasto'),
    tx(0, L('Café con Ana', 'Coffee with Ana'), 'Restaurantes', 3.2, 'gasto', cash, { micro: true }),
    tx(1, L('Abono transporte', 'Transport pass'), 'Transporte', 21.8, 'gasto'),
    tx(2, L('Cena con amigos', 'Dinner with friends'), 'Restaurantes', 28.5, 'gasto'),
    tx(3, 'Spotify', 'Suscripciones', 10.99, 'gasto'),
    tx(4, L('Farmacia', 'Pharmacy'), 'Farmacia', 12.4, 'gasto', cash),
    tx(5, L('Nómina', 'Salary'), 'Nómina', 1680, 'ingreso'),
    tx(6, L('Gimnasio', 'Gym'), 'Salud', 34.9, 'gasto'),
    tx(7, L('Ahorro del mes', 'Monthly savings'), 'Traspaso', 250, 'traspaso', bank, { destination_account_id: savings, savings_month: month }),
    tx(9, L('Libros del curso', 'Course books'), 'Educación', 42, 'gasto'),
    tx(11, L('Venta de chaqueta', 'Jacket sale'), 'Ventas', 45, 'ingreso'),
    tx(13, L('Luz e internet', 'Power and internet'), 'Servicios', 58.7, 'gasto'),
    tx(16, L('Alquiler', 'Rent'), 'Vivienda', 520, 'gasto'),
    tx(19, L('Cine', 'Cinema'), 'Ocio', 9.5, 'gasto', cash),
    tx(32, L('Nómina', 'Salary'), 'Nómina', 1680, 'ingreso'),
    tx(36, L('Ahorro del mes', 'Monthly savings'), 'Traspaso', 250, 'traspaso', bank, { destination_account_id: savings, savings_month: prev }),
  ];
  const debtId = uid(), debt2 = uid();
  const block = (time: string, title: string, kind: string, weekdays = [1, 2, 3, 4, 5], extra: Row = {}): Row => ({ id: uid(), title, description: '', time, weekdays, kind, remind: false, plan_date: null, end_time: null, ...extra });
  const all = [0, 1, 2, 3, 4, 5, 6];
  const blocks: Row[] = [
    block('07:30', L('Despertar y desayuno', 'Wake up and breakfast'), 'rutina', all),
    block('09:00', L('Trabajo enfocado', 'Focused work'), 'trabajo'),
    block('13:30', L('Comida', 'Lunch'), 'comida', all),
    block('15:00', L('Estudio · curso de diseño', 'Study · design course'), 'estudio'),
    block('18:30', L('Entreno', 'Workout'), 'entreno', [1, 3, 5]),
    block('20:30', L('Cena', 'Dinner'), 'comida', all),
    block('22:30', L('Desconectar', 'Wind down'), 'noche', all),
    block('11:00', L('Mercado y compra', 'Market and groceries'), 'compra', [6]),
    { id: uid(), title: L('Recoger paquete', 'Pick up parcel'), description: L('Punto de recogida del barrio', 'Neighbourhood pickup point'), time: '17:15', end_time: '17:45', weekdays: [new Date(today + 'T12:00:00Z').getUTCDay()], kind: 'casa', remind: true, plan_date: today },
  ];
  const item = (data: Row, days: number): Row => ({ id: uid(), profile: 'demo', version: 1, source_key: 'manual:' + uid(), archived: false, created_at: new Date(Date.now() - days * 86400000).toISOString(), updated_at: now, data: { color: '', size: '', person: '', email: '', package_name: '', order_ref: '', purchase_date: shiftDay(today, -days), arrival_date: '', sale_date: '', delivery_date: '', cost: 0, price: 0, expenses: 0, next_action: '', review_date: '', photo: '', ...data } });
  const items: Row[] = [
    item({ activity: 'ventas', model: 'Adidas Samba OG', size: '42', cost: 62, price: 95, tracking: 'En casa', sale: 'Disponible', email: 'orders@example.com' }, 6),
    item({ activity: 'ventas', model: 'New Balance 550', size: '40', cost: 70, price: 110, tracking: 'Enviado', sale: 'Vendido', person: 'marta_v', sale_date: shiftDay(today, -1), shipping_status: 'sent' }, 12),
    item({ activity: 'amigos', model: 'Nike Air Force 1', size: '44', cost: 80, price: 90, tracking: 'Pedido', sale: 'Vendido', person: L('Carlos', 'Carlos') }, 3),
    item({ activity: 'ventas', model: L('Chaqueta vaquera', 'Denim jacket'), size: 'M', cost: 18, price: 0, tracking: 'Pedido', sale: 'Para mí' }, 2),
  ];
  return {
    tables: {
      luden_accounts: accounts,
      luden_transactions: transactions,
      luden_settings: [{ id: 'luden', currency: 'EUR', salary: 1680, monthly_budget: 900, goal_name: L('Viaje a Japón', 'Trip to Japan'), savings_goal: 3000 }],
      luden_budgets: [{ category: 'Restaurantes', amount: 120 }, { category: 'Supermercado', amount: 300 }, { category: 'Ocio', amount: 60 }, { category: 'Transporte', amount: 40 }],
      luden_debts: [
        { id: debtId, title: L('Entradas del concierto', 'Concert tickets'), person: 'Ana', direction: 'me_deben', total: 60, payment_type: 'Único', start_date: shiftDay(today, -10), due_date: shiftDay(today, 12), notes: '', created_at: now },
        { id: debt2, title: L('Portátil a plazos', 'Laptop instalments'), person: L('Tienda', 'Store'), direction: 'debo', total: 600, payment_type: 'Mensual', start_date: shiftDay(today, -60), due_date: null, notes: '', created_at: now },
      ],
      luden_debt_payments: [
        { id: uid(), created_at: now, debt_id: debtId, amount: 20, date: shiftDay(today, -4), account_id: bank, notes: '' },
        { id: uid(), created_at: now, debt_id: debt2, amount: 200, date: shiftDay(today, -30), account_id: bank, notes: '' },
      ],
    },
    blocks, done: [], changes: [], items, events: [], revision: 1,
  };
}

let store: Store | null = null;
function db(): Store {
  if (store) return store;
  try { const saved = sessionStorage.getItem(STORE_KEY); if (saved) return (store = JSON.parse(saved)); } catch { /* ignore */ }
  store = seed(); save(); return store;
}
function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* quota */ } }
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const notAvailable = () => json({ error: L('Disponible al crear tu cuenta. En la demo no se guarda esta acción.', 'Available once you create an account. This action is not saved in the demo.') }, 400);

function filterRows(rows: Row[], params: URLSearchParams) {
  return rows.filter(row => [...params].every(([key, value]) => !['id', 'category'].includes(key) || String(row[key]) === value.replace(/^eq\./, '')));
}
function finance(table: string, method: string, url: URL, init: RequestInit | undefined, headers: Headers) {
  const rows = db().tables[table];
  if (!rows) return json({ error: 'Recurso no permitido.' }, 404);
  const params = url.searchParams, prefer = headers.get('prefer') || '', wantsObject = (headers.get('accept') || '').includes('vnd.pgrst.object');
  const body = typeof init?.body === 'string' && init.body ? JSON.parse(init.body) : null;
  const respond = (result: Row[], status = 200) => {
    if (wantsObject) return result.length ? json(result[0], status) : json({ message: 'No rows' }, 406);
    return prefer.includes('return=representation') || method === 'GET' ? json(result, status) : new Response(null, { status: 204 });
  };
  if (method === 'GET') {
    let result = filterRows(rows, params);
    const order = params.get('order');
    if (order) {
      const keys = order.split(',').map(part => { const [key, dir] = part.split('.'); return { key, desc: dir === 'desc' }; });
      result = [...result].sort((a, b) => { for (const { key, desc } of keys) { const x = String(a[key] ?? ''), y = String(b[key] ?? ''); if (x !== y) return (x < y ? -1 : 1) * (desc ? -1 : 1); } return 0; });
    }
    const offset = Number(params.get('offset') || 0), limit = params.has('limit') ? Number(params.get('limit')) : result.length;
    return respond(result.slice(offset, offset + limit));
  }
  if (method === 'POST') {
    const input: Row[] = Array.isArray(body) ? body : [body];
    const conflict = params.get('on_conflict') || (table === 'luden_budgets' ? 'category' : 'id');
    const saved = input.map(value => {
      const existing = rows.find(row => value[conflict] !== undefined && row[conflict] === value[conflict]);
      if (existing && prefer.includes('merge-duplicates')) return Object.assign(existing, value);
      const row = { ...(table === 'luden_budgets' ? {} : { id: uid(), created_at: new Date().toISOString() }), ...value };
      rows.push(row); return row;
    });
    save(); return respond(saved, 201);
  }
  const matched = filterRows(rows, params);
  if (method === 'PATCH') { matched.forEach(row => Object.assign(row, body)); save(); return respond(matched); }
  if (method === 'DELETE') { db().tables[table] = rows.filter(row => !matched.includes(row)); save(); return respond(matched); }
  return json({ error: 'Operación no válida.' }, 405);
}

function day(method: string, init?: RequestInit) {
  const s = db();
  if (method === 'GET') return json({ blocks: s.blocks, done: s.done, changes: s.changes });
  const body = JSON.parse(String(init?.body || '{}'));
  if (body.action === 'complete') {
    s.done = s.done.filter(row => !(row.block_id === body.block_id && row.day === body.day));
    if (body.done) s.done.push({ block_id: body.block_id, day: body.day });
  } else if (body.action === 'delete') s.blocks = s.blocks.filter(block => block.id !== body.id);
  else if (body.action === 'save-day') {
    s.changes = s.changes.filter(change => change.day !== body.day);
    s.changes.push({ day: body.day, overrides: body.overrides, updated_at: new Date().toISOString() });
  } else if (body.block) {
    const value = { ...body.block } as Row;
    if (body.action === 'save-plan') value.weekdays = [new Date(String(value.plan_date) + 'T12:00:00Z').getUTCDay()];
    else value.plan_date = null;
    const existing = s.blocks.find(block => block.id === value.id);
    if (existing) Object.assign(existing, value); else s.blocks.push({ ...value, id: uid() });
  }
  save(); return json({ ok: true });
}

function management(method: string, url: URL, init?: RequestInit) {
  const s = db();
  if (method === 'GET') {
    if (url.searchParams.has('revision')) return json({ revision: String(s.revision) });
    if (url.searchParams.has('links')) return json({ links: [] });
    if (url.searchParams.has('history')) return json({ events: s.events.filter(event => event.item_id === url.searchParams.get('history')) });
    return json({ revision: String(s.revision), items: s.items.filter(item => !(item.data as Row).deleted_at), events: s.events, accounts: s.tables.luden_accounts, movements: s.tables.luden_transactions, debts: s.tables.luden_debts, debtPayments: s.tables.luden_debt_payments });
  }
  if (!(typeof init?.body === 'string')) return notAvailable();
  const { action, payload } = JSON.parse(init.body);
  const upsert = (row: Row) => {
    const existing = s.items.find(item => item.id === row.id);
    if (existing) { existing.data = row.data; existing.version = Number(existing.version) + 1; existing.updated_at = new Date().toISOString(); }
    else s.items.unshift({ id: uid(), profile: 'demo', version: 1, source_key: row.source_key || null, archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), data: row.data });
  };
  if (action === 'save') upsert(payload);
  else if (action === 'save_many') (payload.items as Row[]).forEach(upsert);
  else if (action === 'archive') { const item = s.items.find(row => row.id === payload.id); if (item) item.archived = !item.archived; }
  else if (action === 'delete_order') s.items = s.items.filter(row => row.id !== payload.id);
  else if (action === 'case_status') { const item = s.items.find(row => row.id === payload.id); if (item) (item.data as Row)[payload.case_type === 'refund' ? 'refund_status' : 'exchange_status'] = payload.status; }
  else return notAvailable();
  s.revision++; save(); return json({ result: { ok: true } });
}

function route(url: URL, method: string, init: RequestInit | undefined, headers: Headers): Response {
  const path = url.pathname;
  if (path === '/api/session') {
    if (method === 'DELETE') { leaveDemo(); return json({ authenticated: false }); }
    return json({ authenticated: true, profile: { id: 'demo', name: 'Demo', hasAccount: true, demo: true } });
  }
  if (path === '/api/time') return json({ epochMs: Date.now(), timeZone: 'Europe/Madrid' });
  if (path.startsWith('/api/finance/')) return finance(decodeURIComponent(path.slice('/api/finance/'.length)), method, url, init, headers);
  if (path === '/api/day') return day(method, init);
  if (path === '/api/management') return management(method, url, init);
  if (path === '/api/notifications' && method === 'GET') return json({ routine_enabled: false, finance_enabled: false, finance_details: false, finance_hour: 9 });
  return notAvailable();
}

let installed = false;
/** Wraps fetch for this tab while the demo is active. Safe to call more than once. */
export function installDemo() {
  if (installed || typeof window === 'undefined' || !demoActive()) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return original(input, init);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    await new Promise(resolve => setTimeout(resolve, 120));
    try { return route(url, method, init, headers); } catch { return json({ error: L('No se pudo completar la operación.', 'Couldn\'t complete the operation.') }, 400); }
  };
}
