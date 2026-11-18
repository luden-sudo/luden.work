"use client";

import { t as tr, tv, locale } from "@/lib/i18n";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Banknote, Bitcoin, CalendarDays, BriefcaseBusiness, Bus, Car, Check, ChevronRight, Clapperboard, Coffee, Download, Gift, GraduationCap, HandCoins, HeartPulse, Home, Landmark, LoaderCircle, Monitor, Moon, MoreHorizontal, PawPrint, PiggyBank, Pencil, Pill, Plane, Plus, ReceiptText, RefreshCw, Repeat, RotateCcw, Search, Settings, SlidersHorizontal, ShoppingBag, ShoppingCart, Smartphone, Sun, Target, Trash2, TrendingUp, Utensils, WalletCards, X, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {acceptProfile,profileHeader,type SessionProfile} from "@/lib/profile-client";
import AuthRedirect from "./auth-redirect";
import AccountSettings from "./account-settings";
import { financeRows, supabase } from "@/lib/supabase";
import { parseAmount } from "@/lib/amount";
import { accountChange, availableBalance, cents, remainingDebt, totalAmounts, formatEuros as money } from "@/lib/finance";
import AreaNav, {AppSidebar} from "./area-nav";
import {useViewPreferences,viewDefaults} from "@/lib/view-preferences";
import ApplePaySetup from "./apple-pay-setup";
import FinanceNotifications from './finance-notifications';
import { LoadingSkeleton } from './loading-skeleton';
import { AnimatedAmount, MotionRow } from './presentation-motion';
import {Bell} from 'lucide-react';
import SavingsManager, { SavingsSummary, type SavingsDeposit } from './savings-manager';
import { SAVINGS_GOAL, SAVINGS_TEMPLATE, monthlySavingsForAccount, savingsMoveCategory, savingsTarget, shiftMonth, validMonth, monthName } from '@/lib/savings';
import { validDay } from '@/lib/day-plan';

type Recurring = {key:string;title:string;account_id:string;category:string;type:"gasto"|"ingreso";day:number;start:string;amount:number};
type Tab = "inicio" | "movimientos" | "cuentas" | "deudas" | "presupuestos" | "ajustes";
type Account = { id: string; name: string; kind: string; opening_balance: number; scope?:string };
type Entry = { id: string; created_at?: string; title: string; account_id: string; destination_account_id?: string | null; savings_month?:string|null; debt_payment_id?: string; category: string; amount: number; type: "gasto" | "ingreso" | "traspaso"; date: string; micro: boolean };
type Preferences = { id: string; currency: string; salary: number; monthly_budget: number; goal_name: string; savings_goal: number };
type Budget = { category: string; amount: number };
type Debt = { id: string; title: string; person: string; direction: "me_deben" | "debo"; total: number; payment_type: string; start_date: string; due_date: string | null; notes: string; created_at: string };
type DebtPayment = { id: string; created_at?: string; debt_id: string; amount: number; date: string; account_id: string | null; notes: string };
type Snapshot = { accounts: Account[]; entries: Entry[]; prefs: Preferences; budgets: Budget[]; debts: Debt[]; debtPayments: DebtPayment[] };
type Editor = { kind: "entry"; value?: Entry; draft?: Entry } | { kind: "recurring"; value?: Recurring } | { kind: "account"; value?: Account } | { kind: "budget"; value?: Budget } | { kind: "debt"; value?: Debt } | { kind: "debtPayment"; debt: Debt; value?: DebtPayment; settle?: boolean } | null;
type InstallEvent = Event & { prompt: () => Promise<void> };
type ThemeChoice = "auto" | "dark" | "light";
const tabs = [{ id: "inicio", label: tr("Resumen"), icon: Home }, { id: "movimientos", label: tr("Movimientos"), icon: ReceiptText }, { id: "cuentas", label: tr("Cuentas"), icon: WalletCards }, { id: "deudas", label: tr("Deudas"), icon: HandCoins }, { id: "presupuestos", label: tr("Límites"), icon: Target }, { id: "ajustes", label: tr("Ajustes"), icon: Settings }] as const;
const expenseCategories = ["Alimentación", "Supermercado", "Restaurantes", "Trabajo", "Transporte", "Ocio", "Compras", "Inversión", "Vivienda", "Servicios", "Coche", "Salud", "Farmacia", "Suscripciones", "Educación", "Viajes", "Mascotas", "Regalos", "Impuestos", "Otros"];
const incomeCategories = ["Nómina", "Trabajo", "Ventas", "Reembolsos", "Inversión", "Intereses", "Regalos", "Otros"];
const debtPaymentCategories = Array.from(new Set([...expenseCategories, ...incomeCategories]));
const PROJECT_CATEGORY = "Trabajo Hacoo";
const PROJECT_BUDGET_PREFIX = "__aurum_project__:";
const MONTH_BUDGET_PREFIX = "__aurum_month__:";
const PROJECT_LIMIT_PREFIX = "__aurum_project_limit__:";
const RECURRING_PREFIX = "__aurum_recurring__:";
const DEBT_PAYMENT_META_PREFIX = "__aurum_debt_payment_v1__:";
const SESSION_KEY = "aurum-session-until";
const THEME_KEY = "aurum-theme";
const INSTALL_DISMISSED_KEY = "aurum-install-dismissed";
const categoryIcons: Record<string, LucideIcon> = { Alimentación: Utensils, Supermercado: ShoppingCart, Restaurantes: Coffee, Trabajo: BriefcaseBusiness, [PROJECT_CATEGORY]: BriefcaseBusiness, Vivienda: Home, Servicios: Zap, Transporte: Bus, Coche: Car, Salud: HeartPulse, Farmacia: Pill, Ocio: Clapperboard, Suscripciones: Repeat, Compras: ShoppingBag, Educación: GraduationCap, Viajes: Plane, Mascotas: PawPrint, Regalos: Gift, Impuestos: ReceiptText, Inversión: TrendingUp, Nómina: Landmark, Ventas: ShoppingBag, Reembolsos: RotateCcw, Intereses: TrendingUp, Deudas: HandCoins, Otros: ReceiptText };
const categoryTones: Record<string,string> = { Alimentación:"orange", Supermercado:"green", Restaurantes:"orange", Trabajo:"indigo", [PROJECT_CATEGORY]:"indigo", Vivienda:"orange", Servicios:"yellow", Transporte:"blue", Coche:"blue", Salud:"red", Farmacia:"red", Ocio:"purple", Suscripciones:"purple", Compras:"pink", Educación:"indigo", Viajes:"teal", Mascotas:"orange", Regalos:"pink", Impuestos:"slate", Inversión:"green", Nómina:"green", Ventas:"teal", Reembolsos:"teal", Intereses:"green", Deudas:"yellow", Otros:"slate" };
function today() { return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()) }

function formNumber(form: FormData, name: string) { const n = parseAmount(String(form.get(name) ?? "")); if (n < 0) throw new Error(tr("El importe no puede ser negativo.")); return n }
function debtPaymentDetails(notes: string | null | undefined): { category: string; note: string } {
  const raw = notes || "";
  if (!raw.startsWith(DEBT_PAYMENT_META_PREFIX)) return { category: "Deudas", note: raw };
  try {
    const parsed: unknown = JSON.parse(raw.slice(DEBT_PAYMENT_META_PREFIX.length));
    if (parsed && typeof parsed === "object" && "category" in parsed && "note" in parsed && typeof parsed.category === "string" && typeof parsed.note === "string") return { category: parsed.category, note: parsed.note };
  } catch { /* A legacy note can contain the same prefix. */ }
  return { category: "Deudas", note: raw };
}
function debtPaymentNotes(category: string, note: string) { return category === "Deudas" ? note : `${DEBT_PAYMENT_META_PREFIX}${JSON.stringify({ category, note })}` }
function dbError(error: { message: string; code?: string }) { return new Error(error.code === "23503" ? "Esta cuenta tiene movimientos. Reasígnalos o elimínalos antes de borrar la cuenta." : error.code === "23505" ? "Ya existe una cuenta o categoría con ese nombre." : "No se pudo guardar. Comprueba la conexión y vuelve a intentarlo.") }

export default function AurumApp() {
  const [profile,setProfile]=useState<SessionProfile|null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [data, setData] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>("inicio");
  const [managementLinks,setManagementLinks]=useState<Record<string,string>>({});
  const [view,setView] = useViewPreferences(profile?.id);
  const [month, setMonth] = useState("");
  const [periodOpen,setPeriodOpen]=useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [accountFilter,setAccountFilter] = useState("");
  const [categoryFilter,setCategoryFilter] = useState("");
  const [projectDetail,setProjectDetail] = useState(false);
  const [accountDetail,setAccountDetail] = useState<string | null>(null);
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [recurringOpen,setRecurringOpen] = useState(false);
  const [lastAccount,setLastAccount] = useState("");
  const [debtView, setDebtView] = useState<"pending" | "history">("pending");
  const [editor, setEditor] = useState<Editor>(null);
  const [deleting, setDeleting] = useState<{ table: string; key: string; value: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const exportLock=useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [theme, setTheme] = useState<ThemeChoice>("auto");
  const [systemDark, setSystemDark] = useState(true);
  const [entryActions, setEntryActions] = useState<Entry | null>(null);
  const [accountActions, setAccountActions] = useState<Account | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [savingsOpen,setSavingsOpen]=useState(false);
  const [financeNotificationsOpen,setFinanceNotificationsOpen]=useState(false);
  const [notificationBusy,setNotificationBusy]=useState(false);
  const request = useRef(0);
  const editing = useRef(false);
  const [install, setInstall] = useState<{ ios: boolean; available: boolean } | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    let alive=true;
    const expired=()=>{request.current++;setAuthenticated(false);setData(null);localStorage.removeItem(SESSION_KEY);};
    window.addEventListener('aurum-session-expired',expired);
    fetch('/api/session',{cache:'no-store'}).then(r=>r.json()).then(value=>{if(alive){setAuthenticated(Boolean(value.authenticated));setProfile(value.profile);if(value.profile)acceptProfile(value.profile);if(new URLSearchParams(window.location.search).get('tab')==='deudas')setTab('deudas');}}).catch(()=>{if(alive)setAuthenticated(false);}).finally(()=>{if(alive)setSessionReady(true);});
    return () => {alive=false;window.removeEventListener('aurum-session-expired',expired);};
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const frame = requestAnimationFrame(() => {
      setLastAccount(localStorage.getItem("aurum-last-account") || "");
      const saved = localStorage.getItem(THEME_KEY);
      setTheme(saved === "light" || saved === "dark" ? saved : "auto");
      setSystemDark(media.matches);
    });
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", update);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "auto" ? (systemDark ? "dark" : "light") : theme;
  }, [theme, systemDark]);

  function chooseTheme(next: ThemeChoice) {
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  }

  const refresh = useCallback(async () => {
    const generation = ++request.current;
    setSyncing(true);
    try {
      // Paginate the ledger: PostgREST's default limit must not truncate balances.
      const [accounts, prefs, budgets, debts, management, entries, debtPayments] = await Promise.all([
        supabase.from("luden_accounts").select("*").order("created_at"),
        supabase.from("luden_settings").select("*").eq("id","luden").single(),
        supabase.from("luden_budgets").select("*").order("category"),
        supabase.from("luden_debts").select("*").order("created_at", { ascending: false }),
        fetch('/api/management?links=1',{cache:'no-store'}).then(async response=>response.ok?response.json():null).catch(()=>null),
        financeRows<Entry>('luden_transactions'),
        financeRows<DebtPayment>('luden_debt_payments'),
      ]);
      if (accounts.error || prefs.error || budgets.error || debts.error) throw new Error(tr("No se pudieron cargar los datos. Pulsa Sincronizar para reintentar."));
      if (generation === request.current) {
        setManagementLinks(Object.fromEntries((management?.links||[]).map((link:{item_id:string;transaction_id:string|null;debt_payment_id:string|null})=>[link.transaction_id||'debt-'+link.debt_payment_id,link.item_id])));
        const movement=new URLSearchParams(window.location.search).get('movement');
        const target=movement?entries.find(entry=>entry.id===movement):undefined;
        if(target){setTab('movimientos');setMonth('');setQuery(target.title);}
        let budgetData: Budget[] = budgets.data;
        if (!budgetData.some(b => b.category.startsWith(MONTH_BUDGET_PREFIX) || b.category.startsWith(PROJECT_LIMIT_PREFIX))) {
          const initial = budgetData.filter(b => !b.category.startsWith("__aurum_")).map(b => ({category:MONTH_BUDGET_PREFIX+today().slice(0,7)+":"+b.category,amount:b.amount}));
          const project = budgetData.find(b => b.category.startsWith(PROJECT_BUDGET_PREFIX));
          if (project) initial.push({category:PROJECT_LIMIT_PREFIX+today().slice(0,7),amount:project.amount});
          if (initial.length) {
            const snapshot = await supabase.from("luden_budgets").upsert(initial,{onConflict:"category",ignoreDuplicates:true}).select();
            if (snapshot.error) throw dbError(snapshot.error);
            budgetData = [...budgetData,...(snapshot.data || [])];
          }
        }
        // Freeze inherited values for this month before any backdated edit.
        const currentMonth=today().slice(0,7);
        const monthlyRows=budgetData.filter(b => b.category.startsWith(MONTH_BUDGET_PREFIX) && b.category.slice(MONTH_BUDGET_PREFIX.length,MONTH_BUDGET_PREFIX.length+7)<=currentMonth).sort((a,b)=>b.category.localeCompare(a.category));
        const inherited=new Map<string,Budget>();
        for(const row of monthlyRows){const name=row.category.slice(MONTH_BUDGET_PREFIX.length+8);if(!inherited.has(name))inherited.set(name,{category:MONTH_BUDGET_PREFIX+currentMonth+":"+name,amount:row.amount});}
        const projectRows=budgetData.filter(b=>b.category.startsWith(PROJECT_LIMIT_PREFIX)&&b.category.slice(PROJECT_LIMIT_PREFIX.length)<=currentMonth).sort((a,b)=>b.category.localeCompare(a.category));
        if(projectRows[0]) inherited.set("__project",{category:PROJECT_LIMIT_PREFIX+currentMonth,amount:projectRows[0].amount});
        const missing=Array.from(inherited.values()).filter(row=>!budgetData.some(b=>b.category===row.category));
        if(missing.length){const snapshot=await supabase.from("luden_budgets").upsert(missing,{onConflict:"category",ignoreDuplicates:true}).select();if(snapshot.error)throw dbError(snapshot.error);budgetData=[...budgetData,...(snapshot.data||[])];}
        if(!budgetData.some(row=>row.category===SAVINGS_GOAL+currentMonth)){
          const snapshot=await supabase.from('luden_budgets').upsert({category:SAVINGS_GOAL+currentMonth,amount:savingsTarget(budgetData,currentMonth)},{onConflict:'category',ignoreDuplicates:true}).select();
          if(snapshot.error)throw dbError(snapshot.error);budgetData=[...budgetData,...(snapshot.data||[])];
        }
        setData({ accounts: accounts.data, prefs: {...prefs.data,currency:'EUR'}, budgets: budgetData, entries, debts: debts.data, debtPayments });
        setError("");
        setLastSync(new Date().toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (e) { if (generation === request.current) setError(e instanceof Error ? e.message : "Error de conexión."); }
    finally { if (generation === request.current) setSyncing(false) }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const mobile = ios || /Android/.test(navigator.userAgent);
    const media = window.matchMedia("(display-mode: standalone)");
    const updateInstall = () => setInstall({ ios, available: mobile && !(media.matches || (navigator as Navigator & { standalone?: boolean }).standalone) });
    const dismissedFrame = requestAnimationFrame(() => setInstallDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === "1"));
    const frame = requestAnimationFrame(updateInstall);
    const capture = (e: Event) => { e.preventDefault(); setPrompt(e as InstallEvent) };
    const installed = () => { updateInstall(); setInstallOpen(false); setPrompt(null) };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    media.addEventListener("change", updateInstall);
    const initial = setTimeout(() => void refresh(), 0);
    const sync = () => { if (!document.hidden && !editing.current) void refresh() };
    const interval = setInterval(sync, 120000);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { clearTimeout(initial); clearInterval(interval); cancelAnimationFrame(frame); cancelAnimationFrame(dismissedFrame); media.removeEventListener("change",updateInstall); window.removeEventListener("beforeinstallprompt",capture); window.removeEventListener("appinstalled",installed); window.removeEventListener("focus",sync); window.removeEventListener("online",sync); document.removeEventListener("visibilitychange",sync) };
  }, [refresh, authenticated]);
  useEffect(() => { editing.current = Boolean(editor || deleting || projectOpen || savingsOpen || financeNotificationsOpen || busy || tab === "ajustes") }, [editor, deleting, projectOpen, savingsOpen, financeNotificationsOpen, busy, tab]);
  useEffect(() => { if (message) { const timer = setTimeout(() => setMessage(""), 3500); return () => clearTimeout(timer) } }, [message]);

  async function save(operation: () => Promise<void>, success = "Guardado") {
    if (busy) return false;
    setBusy(true); setError(""); request.current++;
    try { await operation(); setEditor(null); setDeleting(null); setProjectOpen(false); await refresh(); setMessage(success);return true }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar.");return false }
    finally { setBusy(false) }
  }
  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await save(async () => {
      if (editor?.kind === "entry") {
        const type = String(form.get("type")) as Entry["type"];
        if(type==='traspaso'&&form.get('transfer_scope')==='month'){
          if(editor.value)throw new Error(tr("Este traspaso entre meses no se puede editar desde aquí."));
          const from=String(form.get('source_month')),to=String(form.get('destination_month')),accountId=String(form.get('savings_account')),amount=formNumber(form,'amount');
          const account=data?.accounts.find(row=>row.id===accountId&&row.kind==='Ahorro');
          if(!validMonth(from)||!validMonth(to)||from===to||amount<=0||!account)throw new Error(tr("Elige la cuenta, dos meses diferentes y un importe mayor que cero."));
          if(cents(amount)>cents(monthlySavingsForAccount(data?.entries||[],account,from,data?.budgets||[])))throw new Error(tr("Esa cuenta no tiene suficiente ahorro asignado al mes de origen."));
          const result=await supabase.from('luden_budgets').insert({category:savingsMoveCategory(from,to,crypto.randomUUID(),accountId),amount}).select().single();
          if(result.error)throw dbError(result.error);
          return;
        }
        const account_id = String(form.get("account_id"));
        const destination = type === "traspaso" ? String(form.get("destination_account_id")) : null;
        const savings_month=String(form.get('savings_month')||'')||null;
        if(savings_month&&!validMonth(savings_month))throw new Error(tr("Revisa el mes de ahorro."));
        const row = { title: String(form.get("title")).trim(), amount: formNumber(form,"amount"), category: type === "traspaso" ? "Traspaso" : String(form.get("category")), account_id, destination_account_id: destination, savings_month, type, date: String(form.get("date")), micro: type === "gasto" && form.get("micro") === "on" };
        if (!row.title || row.amount <= 0) throw new Error(tr("Escribe un concepto y un importe mayor que cero."));
        if (type === "traspaso" && (!destination || destination === account_id)) throw new Error(tr("Elige dos cuentas diferentes para el traspaso."));
        const result = editor.value ? await supabase.from("luden_transactions").update(row).eq("id",editor.value.id).select().single() : await supabase.from("luden_transactions").insert(row).select().single();
        if (result.error) throw dbError(result.error);
        localStorage.setItem("aurum-last-account",account_id); setLastAccount(account_id);
      } else if (editor?.kind === "recurring") {
        const title=String(form.get("title")).trim(), account_id=String(form.get("account_id")), category=String(form.get("category")), type=String(form.get("type"));
        const amount=formNumber(form,"amount"), day=Number(form.get("day")), start=String(form.get("start"));
        if (!title || amount <= 0 || !data?.accounts.some(a => a.id === account_id) || !Number.isInteger(day) || day < 1 || day > 31 || !["gasto","ingreso"].includes(type) || !/^\d{4}-\d{2}$/.test(start)) throw new Error(tr("Completa los datos del movimiento recurrente."));
        const key=RECURRING_PREFIX+JSON.stringify({id:crypto.randomUUID(),title,account_id,category,type,day,start});
        const result=editor.value ? await supabase.from("luden_budgets").update({category:key,amount}).eq("category",editor.value.key).select().single() : await supabase.from("luden_budgets").insert({category:key,amount}).select().single();
        if(result.error) throw dbError(result.error);
      } else if (editor?.kind === "account") {
        const row = { name: String(form.get("name")).trim(), kind: String(form.get("kind")) };
        if (!row.name) throw new Error(tr("Escribe un nombre para la cuenta."));
        const result = editor.value ? await supabase.from("luden_accounts").update(row).eq("id",editor.value.id).select().single() : await supabase.from("luden_accounts").insert({...row,opening_balance:0}).select().single();
        if (result.error) throw dbError(result.error);
      } else if (editor?.kind === "budget") {
        const row = { category: MONTH_BUDGET_PREFIX+(month || today().slice(0,7))+":"+String(form.get("category")), amount: formNumber(form,"amount") };
        if (row.amount <= 0) throw new Error(tr("El límite debe ser mayor que cero."));
        const result = await supabase.from("luden_budgets").upsert(row).select().single();
        if (result.error) throw dbError(result.error);
      } else if (editor?.kind === "debt") {
        const row = { title: String(form.get("title")).trim(), person: String(form.get("person")).trim(), direction: String(form.get("direction")), total: formNumber(form,"total"), payment_type: String(form.get("payment_type")), start_date: String(form.get("start_date")), due_date: String(form.get("due_date")) || null, notes: String(form.get("notes")).trim() };
        if (!row.title || !row.person || row.total <= 0) throw new Error(tr("Completa el concepto, la persona y una cantidad mayor que cero."));
        if (editor.value && cents(row.total) < cents(totalAmounts(data?.debtPayments.filter(p => p.debt_id === editor.value?.id).map(p => p.amount) || []))) throw new Error(tr("El total no puede ser menor que los pagos registrados."));
        if (row.due_date && row.due_date < row.start_date) throw new Error(tr("La fecha límite no puede ser anterior al inicio."));
        if (editor.value && row.direction !== editor.value.direction && data?.debtPayments.some(p => p.debt_id === editor.value?.id)) throw new Error(tr("No puedes cambiar la dirección de una deuda con pagos: alteraría los movimientos registrados."));
        const result = editor.value ? await supabase.from("luden_debts").update(row).eq("id",editor.value.id).select().single() : await supabase.from("luden_debts").insert(row).select().single();
        if (result.error) throw dbError(result.error);
      } else if (editor?.kind === "debtPayment") {
        const amount = formNumber(form,"amount");
        const paid = totalAmounts(data?.debtPayments.filter(p => p.debt_id === editor.debt.id && p.id !== editor.value?.id).map(p => p.amount) || []);
        if (amount <= 0 || cents(amount) > cents(editor.debt.total) - cents(paid)) throw new Error(tr("El pago supera el importe pendiente."));
        const account_id = String(form.get("account_id"));
        if (!account_id || !data?.accounts.some(account => account.id === account_id)) throw new Error(tr("Elige la cuenta donde se recibió o pagó el dinero."));
        const category = String(form.get("category") || "Deudas");
        if (category !== "Deudas" && category !== PROJECT_CATEGORY && !debtPaymentCategories.includes(category)) throw new Error(tr("Elige una categoría válida para este pago."));
        const row = { debt_id: editor.debt.id, amount, date: String(form.get("date")), account_id, notes: debtPaymentNotes(category, String(form.get("notes")).trim()) };
        const result = editor.value ? await supabase.from("luden_debt_payments").update(row).eq("id",editor.value.id).select().single() : await supabase.from("luden_debt_payments").insert(row).select().single();
        if (result.error) throw dbError(result.error);
      }
    });
  }
  async function exportData() {
    if (!profile||exportLock.current) return;
    exportLock.current=true;setError('');setMessage('');
    const owner=profile.id;
    try{
      const response=await fetch('/api/backup',{cache:'no-store',headers:{'x-aurum-profile':owner}});
      if(!response.ok)throw new Error(tr("No se pudo preparar la copia completa. Vuelve a intentarlo."));
      const backup=await response.json();
      if(backup.profile?.id!==owner||profileHeader()!==owner)throw new Error(tr("El perfil cambió. Vuelve a preparar la copia."));
      backup.device_preferences={theme,summary:view};
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=owner+'-copia-completa-'+today()+'.json';document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      setMessage(tr("Copia completa preparada. Guárdala en Archivos o Descargas."));
    }catch(error){setError((error as Error).message);}
    finally{exportLock.current=false;}
  }

  if (!sessionReady) return <main className="skeleton-screen"><LoadingSkeleton label={tr("Cargando…")} /></main>;
  if (!authenticated) return <AuthRedirect/>;
  if (!data) return error ? <main className="loading-screen"><p role="alert">{tv(error)}</p><button className="primary" onClick={() => void refresh()}>{tr("Reintentar")}</button></main> : <main className="skeleton-screen"><LoadingSkeleton label={tr("Cargando tus finanzas…")} /></main>;

  const debtById = new Map(data.debts.map(debt => [debt.id, debt]));
  const debtEntries: Entry[] = data.debtPayments.flatMap(payment => {
    const debt = debtById.get(payment.debt_id);
    if (!debt || !payment.account_id) return [];
return [{ id: `debt-${payment.id}`, debt_payment_id: payment.id, created_at: payment.created_at, title: `${debt.direction === "me_deben" ? "Cobro" : "Pago"} · ${debt.title}`, account_id: payment.account_id, category: debtPaymentDetails(payment.notes).category, amount: Number(payment.amount), type: debt.direction === "me_deben" ? "ingreso" as const : "gasto" as const, date: payment.date, micro: false }];
  });
  const ledgerEntries = [...data.entries, ...debtEntries].sort((a,b) => b.date.localeCompare(a.date) || (Date.parse(b.created_at || "") || 0) - (Date.parse(a.created_at || "") || 0) || b.id.localeCompare(a.id));
  const monthly = month ? ledgerEntries.filter(t => t.date.startsWith(month)) : ledgerEntries;
  const periodLabel = month ? new Date(`${month}-01T12:00:00`).toLocaleDateString(locale(), { month: "long", year: "numeric" }) : "Todo el historial";
  const budgetMonth = month || today().slice(0,7);
  const budgetLabel = new Date(`${budgetMonth}-01T12:00:00`).toLocaleDateString(locale(), { month: "long", year: "numeric" });
  const businessIds=new Set(data.accounts.filter(a=>a.scope==='business').map(a=>a.id));
  const budgetEntries = ledgerEntries.filter(t => t.date.startsWith(budgetMonth)&&!businessIds.has(t.account_id));
  const income = totalAmounts(monthly.filter(t => t.type === "ingreso"&&!businessIds.has(t.account_id)).map(t => t.amount));
  const expense = totalAmounts(monthly.filter(t => t.type === "gasto"&&!businessIds.has(t.account_id)).map(t => t.amount));
  const balances = data.accounts.map(a => ({ ...a, balance: totalAmounts([a.opening_balance, accountChange(ledgerEntries, a.id)]) }));
  const total = availableBalance(balances.filter(a=>a.scope!=='business'));
  const savings = totalAmounts(balances.filter(a => a.kind === "Ahorro").map(a => a.balance));
  const savingsProps={accounts:data.accounts,entries:ledgerEntries,budgets:data.budgets,total:savings,currentMonth:today().slice(0,7),money};
  const saveSavingsDeposit=(deposit:SavingsDeposit)=>save(async()=>{
    if(!validMonth(deposit.month)||!validDay(deposit.date)||deposit.amount<=0||!data.accounts.some(account=>account.id===deposit.source&&account.kind!=='Ahorro')||!data.accounts.some(account=>account.id===deposit.destination&&account.kind==='Ahorro'))throw new Error(tr("Revisa las cuentas, la fecha y el importe."));
    const result=await supabase.from('luden_transactions').insert({title:'Ahorro · '+monthName(deposit.month),category:'Traspaso',amount:deposit.amount,account_id:deposit.source,destination_account_id:deposit.destination,type:'traspaso',date:deposit.date,savings_month:deposit.month,micro:false}).select().single();
    if(result.error)throw dbError(result.error);
  },'Ahorro guardado');
  const saveSavingsTarget=(selectedMonth:string,amount:number,following:boolean)=>save(async()=>{
    if(!validMonth(selectedMonth)||!Number.isFinite(amount)||amount<0)throw new Error(tr("Revisa el mes y el objetivo."));
    const rows=[{category:SAVINGS_GOAL+selectedMonth,amount},...(following?[{category:SAVINGS_TEMPLATE+shiftMonth(selectedMonth,1),amount}]:[])];
    const result=await supabase.from('luden_budgets').upsert(rows,{onConflict:'category'});
    if(result.error)throw dbError(result.error);
  },'Objetivo actualizado');
  const debtProgress = (debt: Debt) => remainingDebt(Number(debt.total), data.debtPayments.filter(p => p.debt_id === debt.id).map(p => p.amount));
  const debtSummary = { receivable: totalAmounts(data.debts.filter(d => d.direction === "me_deben").map(d => debtProgress(d).remaining)), payable: totalAmounts(data.debts.filter(d => d.direction === "debo").map(d => debtProgress(d).remaining)) };
  const pendingDebts = data.debts.filter(debt => debtProgress(debt).remaining > 0.005);
  const settledDebts = data.debts.filter(debt => debtProgress(debt).remaining <= 0.005);
  const displayedDebts = debtView === "pending" ? pendingDebts : settledDebts;
  const projectBudget = data.budgets.find(b => b.category.startsWith(PROJECT_BUDGET_PREFIX));
  const projectName = projectBudget?.category.slice(PROJECT_BUDGET_PREFIX.length) || (profile?.id==='luden'?PROJECT_CATEGORY:'Mi proyecto');
  const projectExpenses = totalAmounts(monthly.filter(t => t.category === PROJECT_CATEGORY && t.type === "gasto").map(t => t.amount));
  const projectIncome = totalAmounts(monthly.filter(t => t.category === PROJECT_CATEGORY && t.type === "ingreso").map(t => t.amount));
  const projectLimitHistory = data.budgets.filter(b => b.category.startsWith(PROJECT_LIMIT_PREFIX) && b.category.slice(PROJECT_LIMIT_PREFIX.length) <= budgetMonth).sort((a,b) => b.category.localeCompare(a.category));
  const projectLimit = Number(projectLimitHistory[0]?.amount || 0);
  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      const name = String(form.get("project_name") || "").trim();
      if (!name || name.length > 80) throw new Error(tr("Escribe un nombre de hasta 80 caracteres."));
      const amount = formNumber(form,"project_limit");
      const category = `${PROJECT_BUDGET_PREFIX}${name}`;
      const result = projectBudget
        ? await supabase.from("luden_budgets").update({category,amount}).eq("category",projectBudget.category).select().single()
        : await supabase.from("luden_budgets").insert({category,amount}).select().single();
      if (result.error) throw dbError(result.error);
      const snapshot = await supabase.from("luden_budgets").upsert({category:PROJECT_LIMIT_PREFIX+budgetMonth,amount});
      if(snapshot.error) throw dbError(snapshot.error);
    }, "Proyecto actualizado");
  };
  const movementCategories = Array.from(new Set([...expenseCategories,...incomeCategories,PROJECT_CATEGORY,...ledgerEntries.map(t => t.category)])).filter(c => c !== "Traspaso").sort((a,b) => a.localeCompare(b,locale()));
  const projectEntries = monthly.filter(t => t.category === PROJECT_CATEGORY);
  const visible = monthly.filter(t => (!accountFilter || t.account_id === accountFilter || t.destination_account_id === accountFilter) && (!categoryFilter || t.category === categoryFilter) && (filter === "todos" || (filter === "hormiga" ? t.micro && t.type === "gasto" : t.type === filter)) && `${t.title} ${t.category === PROJECT_CATEGORY ? projectName : t.category} ${data.accounts.find(a => a.id === t.account_id)?.name} ${data.accounts.find(a => a.id === t.destination_account_id)?.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  const budgetHistory = data.budgets.filter(b => b.category.startsWith(MONTH_BUDGET_PREFIX)).map(b => ({...b,month:b.category.slice(MONTH_BUDGET_PREFIX.length,MONTH_BUDGET_PREFIX.length+7),name:b.category.slice(MONTH_BUDGET_PREFIX.length+8)})).filter(b => b.month <= budgetMonth).sort((a,b) => b.month.localeCompare(a.month));
  const budgetByCategory = new Map<string,{category:string;amount:number}>();
  for(const b of budgetHistory) if(!budgetByCategory.has(b.name)) budgetByCategory.set(b.name,{category:b.name,amount:Number(b.amount)});
  const activeBudgets = Array.from(budgetByCategory.values()).filter(b => b.amount > 0).sort((a,b) => a.category.localeCompare(b.category,locale()));
  const spent = (category: string) => totalAmounts(budgetEntries.filter(t => t.type === "gasto" && t.category === category).map(t => t.amount));
  const recurring = data.budgets.flatMap(b => {
    if(!b.category.startsWith(RECURRING_PREFIX)) return [];
    try{const item=JSON.parse(b.category.slice(RECURRING_PREFIX.length));if(typeof item.title !== "string" || !["gasto","ingreso"].includes(item.type))return [];return [{...item,key:b.category,amount:Number(b.amount)} as Recurring];}catch{return [];}
  });
  const recurringDate = (item:Recurring) => {
    const current=today().slice(0,7), target=item.start > current ? item.start : current;
    const lastDay=new Date(Number(target.slice(0,4)),Number(target.slice(5,7)),0).getDate();
    return target+"-"+String(Math.min(item.day,lastDay)).padStart(2,"0");
  };
  const recurringRegistered = (item:Recurring) => data.entries.some(e => e.title === item.title && e.account_id === item.account_id && e.category === item.category && e.type === item.type && e.date.startsWith(recurringDate(item).slice(0,7)));
  const confirmRecurring = (item:Recurring) => {
    if(recurringRegistered(item)){setMessage(tr("Este movimiento ya está registrado este mes."));return;}
    setEditor({kind:"entry",draft:{id:"",title:item.title,account_id:item.account_id,category:item.category,type:item.type,amount:item.amount,date:recurringDate(item),micro:false}});
  };
  const accountView = balances.find(a => a.id === accountDetail);
  const accountEntries = monthly.filter(e => e.account_id === accountDetail || e.destination_account_id === accountDetail);
  const newEntry = () => { setLastAccount(localStorage.getItem("aurum-last-account") || ""); setEditor(data.accounts.length ? { kind: "entry" } : { kind: "account" }); };
  const duplicateEntry = (entry:Entry) => { setProjectDetail(false); setAccountDetail(null); setEntryActions(null); setEditor({kind:"entry",draft:{...entry,id:"",debt_payment_id:undefined,date:today(),created_at:undefined}}); };
  const editEntry = (entry: Entry) => {
    setProjectDetail(false); setAccountDetail(null);
    if (entry.debt_payment_id) {
      const payment = data.debtPayments.find(item => item.id === entry.debt_payment_id);
      const debt = payment && debtById.get(payment.debt_id);
      if (payment && debt) setEditor({kind:"debtPayment",debt,value:payment});
    } else setEditor({kind:"entry",value:entry});
  };
  const deleteEntry = (entry: Entry) => { setProjectDetail(false); setAccountDetail(null); setDeleting({table:entry.debt_payment_id ? "luden_debt_payments" : "luden_transactions",key:"id",value:entry.debt_payment_id || entry.id,label:entry.title}); };
  const row = (entry: Entry) => {
    const Icon = entry.type === "traspaso" ? ArrowLeftRight : categoryIcons[entry.category] || ReceiptText;
    const account = data.accounts.find(a => a.id === entry.account_id);
    const AccountIcon = account?.kind === "Cripto" ? Bitcoin : account?.kind === "Efectivo" ? Banknote : account?.kind === "Ahorro" ? PiggyBank : Landmark;
    const destination = data.accounts.find(a => a.id === entry.destination_account_id)?.name || "Cuenta eliminada";
    const kind = entry.type === "ingreso" ? "Ingreso" : entry.type === "traspaso" ? "Traspaso" : "Gasto";
    return <MotionRow className={`movement-row movement-${entry.type}`} key={entry.id}>
      <span className={`movement-icon category-symbol category-symbol--${entry.type==="traspaso"?"teal":categoryTones[entry.category]||"slate"}`} aria-hidden="true"><Icon size={23}/></span>
      <div className="movement-copy">
        <strong className="movement-title">{tv(entry.title)}</strong>
        {managementLinks[entry.id]&&<Link className="movement-savings-month" href={'/gestiones?item='+managementLinks[entry.id]}>{tr("Abrir gestión")}<ChevronRight size={13}/></Link>}
        {entry.savings_month&&<small className="movement-savings-month"><PiggyBank size={13}/>{tr("Ahorro de")} {monthName(entry.savings_month)}</small>}
        <div className="movement-meta"><span>{tv(entry.category === PROJECT_CATEGORY ? projectName : entry.category)}</span><span aria-hidden="true">·</span><time dateTime={entry.date}>{new Date(entry.date+"T12:00:00").toLocaleDateString(locale(),{day:"numeric",month:"short"})}</time>{entry.micro && <span>{tr("· Hormiga")}</span>}</div>
        <span className="movement-account"><AccountIcon size={15} aria-hidden="true"/><span>{tv(account?.name || tr("Cuenta eliminada"))}{entry.type === "traspaso" && ` → ${destination}`}</span></span>
      </div>
      <div className="movement-value"><strong>{tv(entry.type === "ingreso" ? "+" : entry.type === "traspaso" ? "↔ " : "−")}{money(Number(entry.amount))}</strong><span>{tv(kind)}</span></div>
      <div className="row-actions"><button className="icon-button" aria-label={tr("Editar {0}",{0:entry.title})} onClick={() => editEntry(entry)}><Pencil size={18}/></button><button className="icon-button" aria-label={tr("Duplicar {0}",{0:entry.title})} onClick={() => duplicateEntry(entry)}><Repeat size={18}/></button><button className="icon-button danger" aria-label={tr("Eliminar {0}",{0:entry.title})} onClick={() => deleteEntry(entry)}><Trash2 size={18}/></button></div>
      <button className="icon-button mobile-row-actions" aria-label={tr("Opciones de {0}",{0:entry.title})} onClick={() => setEntryActions(entry)}><MoreHorizontal size={22}/></button>
    </MotionRow>;
  };
  const groupedRows = (entries: Entry[]) => {
    const groups = new Map<string, Entry[]>();
    for (const entry of entries) {
      const key = entry.date.slice(0,7);
      const group = groups.get(key) || [];
      group.push(entry);
      groups.set(key,group);
    }
    return Array.from(groups,([key,items]) => <section className="movement-month" key={key}><h3 className="movement-month-heading">{new Date(key+"-01T12:00:00").toLocaleDateString(locale(),{month:"long",year:"numeric"})}</h3>{items.map(row)}</section>);
  };
  return <div className="app">
    <AppSidebar active="dinero" profileName={profile?.name}/>
    <main className="workspace">
      <header className="topbar"><div><h1>{tv(tabs.find(t => t.id === tab)?.label)}</h1></div><div className="header-tools"><details className="finance-more" onKeyDown={e=>{if(e.key==="Escape")e.currentTarget.removeAttribute("open");}}><summary className="icon-button" aria-label={tr("Opciones de dinero")} title={tr("Opciones de dinero")}><MoreHorizontal size={22}/></summary><div className="finance-more-panel">{["inicio","movimientos","presupuestos"].includes(tab)&&<button type="button" className="secondary mobile-period-control" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setPeriodOpen(true);}}><CalendarDays size={17} aria-hidden="true"/><span>{tv(month?monthName(month):tr("Todo"))}</span><ChevronRight size={17}/></button>}<button className="secondary" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setRecurringOpen(true);}}><Repeat size={18}/>{tr("Repeticiones")}</button><button className="icon-button mobile-settings" aria-label={tr("Ajustes")} title={tr("Ajustes")} aria-pressed={tab === "ajustes"} onClick={() => setTab("ajustes")}><Settings size={23} strokeWidth={1.8} aria-hidden="true"/><span>{tr("Ajustes")}</span></button>{tab==='inicio'&&<details className="summary-customize" onKeyDown={e=>{if(e.key==="Escape")e.currentTarget.removeAttribute("open");}}><summary className="icon-button" aria-label={tr("Personalizar resumen")} title={tr("Personalizar resumen")}><SlidersHorizontal size={19}/><span>{tr("Personalizar resumen")}</span></summary><div className="summary-customize-panel"><h2>{tr("Tu resumen")}</h2><p className="help">{tr("Elige qué quieres ver. Se guarda para tu perfil en este dispositivo.")}</p><fieldset><legend>{tr("Información principal")}</legend>{([['balance','Saldo disponible'],['income','Ingresos'],['expenses','Gastos'],['net','Ingresos menos gastos'],['savingsTotal','Ahorro total']] as const).map(([key,label])=><label key={key}><span>{tv(label)}</span><input type="checkbox" checked={view[key]} onChange={e=>setView({...view,[key]:e.target.checked})}/></label>)}</fieldset><fieldset><legend>{tr("Secciones")}</legend>{([['recent','Últimos movimientos'],['limits','Límites'],['project','Proyecto'],['savings','Objetivo de ahorro']] as const).map(([key,label])=><label key={key}><span>{tv(label)}</span><input type="checkbox" checked={view[key]} onChange={e=>setView({...view,[key]:e.target.checked})}/></label>)}</fieldset><label className="summary-customize-count">{tr("Movimientos visibles")}<select value={view.recentCount} disabled={!view.recent} onChange={e=>setView({...view,recentCount:Number(e.target.value)})}>{[3,5,6,8].map(count=><option key={count} value={count}>{tv(count)} {tr("movimientos")}</option>)}</select></label><label className="summary-customize-density"><span>{tr("Filas compactas")}</span><input type="checkbox" checked={view.compact} onChange={e=>setView({...view,compact:e.target.checked})}/></label><div className="summary-customize-actions"><button className="text-button" onClick={()=>setView({...viewDefaults,completed:view.completed})}>{tr("Restablecer")}</button><button className="secondary" onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>{tr("Listo")}</button></div></div></details>}<ThemeControl value={theme} onChange={chooseTheme}/><button className="icon-button sync-button" aria-label={tr("Sincronizar")} title={tr("Sincronizado a las {0}",{0:lastSync})} onClick={() => void refresh()} disabled={syncing}><RefreshCw size={18} className={syncing ? "spin" : ""} /><span>{tr("Actualizar datos")}</span></button></div></details>{tab!=="ajustes"&&<button className="primary add-entry" aria-label={tv(tab==='cuentas'?tr("Añadir cuenta"):tab==='deudas'?tr("Añadir deuda"):tab==='presupuestos'?tr("Añadir límite"):tr("Añadir movimiento"))} onClick={()=>tab==='cuentas'?setEditor({kind:'account'}):tab==='deudas'?setEditor({kind:'debt'}):tab==='presupuestos'?setEditor({kind:'budget'}):newEntry()}><Plus size={18} /><span>{tv(tab==='cuentas'?tr("Cuenta"):tab==='deudas'?tr("Deuda"):tab==='presupuestos'?tr("Límite"):tr("Movimiento"))}</span></button>}</div></header>
      <nav className="finance-subnav" aria-label={tr("Apartados de Dinero")}>{tabs.filter(t => t.id !== "ajustes").map(t => <button key={t.id} className={tab === t.id ? "selected" : ""} aria-current={tab === t.id ? "page" : undefined} aria-label={tv(t.label)} onClick={() => setTab(t.id)}><t.icon size={20}/><span>{tv(t.id === "movimientos" ? tr("Movim.") : t.label)}</span></button>)}</nav>
      {error && <div className="error-banner" role="alert">{tv(error)}<button onClick={() => void refresh()}>{tr("Reintentar")}</button></div>}
      {install?.available && !installDismissed && tab === "inicio" && <aside className="install-invite"><span className="install-invite-icon"><Smartphone size={21}/></span><div><strong>{tr("luden también en tu inicio")}</strong><p>{tr("Ábrela más rápido desde la pantalla de tu móvil.")}</p></div><button className="secondary" onClick={() => setInstallOpen(true)}>{tr("Cómo instalar")}</button><button className="icon-button" aria-label={tr("Ocultar invitación para instalar")} onClick={() => { localStorage.setItem(INSTALL_DISMISSED_KEY,"1"); setInstallDismissed(true) }}><X size={18}/></button></aside>}
      {["inicio","movimientos","presupuestos"].includes(tab) && <div className="period"><div className="period-picker"><div className="period-mode" role="group" aria-label={tr("Periodo")}><button aria-pressed={!month} onClick={() => setMonth("")}>{tr("Todo")}</button><button aria-pressed={Boolean(month)} onClick={() => setMonth(month || today().slice(0,7))}>{tr("Mes")}</button></div>{month && <input type="month" aria-label={tr("Elegir mes")} value={month} onChange={e => setMonth(e.target.value)} />}</div></div>}
      <div className="page" key={tab}>
      {tab==='cuentas'&&<section className="panel savings-account-panel"><div className="panel-body"><SavingsSummary {...savingsProps} onOpen={()=>{setError('');setSavingsOpen(true);}}/></div></section>}
      {tab === "inicio" && <>
        {!view.balance&&!view.income&&!view.expenses&&!view.net&&!view.savingsTotal&&!view.recent&&!view.limits&&!view.project&&!view.savings&&<p className="help">{tr("Has ocultado todas las secciones. Puedes volver a mostrarlas desde el botón de personalización junto al tema.")}</p>}

        {view.balance&&<section className="balance-hero"><div><span>{tr("Saldo disponible")}</span><strong><AnimatedAmount value={total}>{money(total)}</AnimatedAmount></strong></div><WalletCards size={52} strokeWidth={1.3} /></section>}
        <section className="stats summary-stats">{[{visible:view.income,label:tr("Ingresos"),value:income,icon:ArrowDownLeft,color:"green"},{visible:view.expenses,label:tr("Gastos"),value:expense,icon:ArrowUpRight,color:"orange"},{visible:view.net,label:tr("Ingresos menos gastos"),value:income-expense,icon:TrendingUp,color:"blue"},{visible:view.savingsTotal,label:tr("Ahorro total"),value:savings,icon:PiggyBank,color:"gold"}].filter(s=>s.visible).map(s => <article className="stat" key={s.label}><span className={`stat-icon ${s.color}`}><s.icon size={20}/></span><span>{tv(s.label)}</span><strong><AnimatedAmount value={s.value}>{money(s.value)}</AnimatedAmount></strong></article>)}</section>
        <div className={`overview-grid ${!view.recent||(!view.limits&&!view.project&&!view.savings)?"overview-single":""} ${view.compact?"summary-compact":""}`}>{view.recent&&<section className="panel history-panel"><div className="panel-heading"><h2>{tr("Últimos movimientos")}</h2><button className="text-button" onClick={() => setTab("movimientos")}>{tr("Ver todos")}<ChevronRight size={16}/></button></div>{tv(monthly.length ? <div className="history-scroll">{groupedRows(monthly.slice(0,view.recentCount))}</div> : <Empty onAdd={newEntry} />)}</section>}
        {(view.limits||view.project||view.savings)&&<section className="panel"><div className="panel-heading"><h2>{tr("Tus objetivos")}</h2><Target size={19}/></div><div className="panel-body limits-overview">{view.limits&&<><p className="help">{tr("Límites ·")} {tv(budgetLabel)}</p>{tv(activeBudgets.length ? activeBudgets.map(b => { const used = spent(b.category); const limit = Number(b.amount); return <div className="goal limit-summary" key={b.category}><span><Target size={18} aria-hidden="true"/>{tv(b.category)}</span><BudgetStatus used={used} limit={limit} money={money}/><strong>{money(used)} <small>/ {money(limit)}</small></strong><Progress value={used} max={limit}/></div> }) : <p className="limits-empty">{tr("Todavía no hay límites configurados.")}</p>)}<button className="text-button" onClick={() => setTab("presupuestos")}>{tv(activeBudgets.length ? tr("Ver todos los límites") : tr("Añadir un límite"))}<ChevronRight size={16}/></button></>}{view.project&&<ProjectSummary name={projectName} income={projectIncome} expenses={projectExpenses} limit={month ? projectLimit : 0} periodLabel={periodLabel} money={money} onEdit={() => setProjectOpen(true)} onDetails={() => setProjectDetail(true)} compact/>}{view.savings&&<SavingsSummary {...savingsProps} currentMonth={budgetMonth} onOpen={()=>{setError('');setSavingsOpen(true);}}/>}</div></section>}</div>
      </>}
      {tab === "movimientos" && <><div className={`ledger-toolbar ${filtersOpen ? "filters-open" : ""}`}><button className="secondary filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>{tr("Filtros")}{tv((filter !== "todos" || accountFilter || categoryFilter) ? tr(" · activos") : "")}</button><label className="search"><Search size={18}/><input placeholder={tr("Buscar movimientos")} aria-label={tr("Buscar movimientos")} value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label={tr("Tipo de movimiento")} value={filter} onChange={e => setFilter(e.target.value)}><option value="todos">{tr("Todos")}</option><option value="gasto">{tr("Gastos")}</option><option value="ingreso">{tr("Ingresos")}</option><option value="traspaso">{tr("Traspasos")}</option><option value="hormiga">{tr("Hormiga")}</option></select><select aria-label={tr("Filtrar por cuenta")} value={accountFilter} onChange={e => setAccountFilter(e.target.value)}><option value="">{tr("Todas las cuentas")}</option>{data.accounts.map(account => <option key={account.id} value={account.id}>{tv(account.name)}</option>)}</select><select aria-label={tr("Filtrar por categoría")} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">{tr("Todas las categorías")}</option>{movementCategories.map(category => <option key={category} value={category}>{tv(category === PROJECT_CATEGORY ? projectName : category)}</option>)}</select>{(query || filter !== "todos" || accountFilter || categoryFilter) && <button className="text-button" onClick={() => {setQuery("");setFilter("todos");setAccountFilter("");setCategoryFilter("");}}>{tr("Limpiar filtros")}</button>}</div><section className="panel"><div className="panel-heading"><h2>{visible.length} {tr("movimientos")}</h2><span>{money(totalAmounts(visible.map(t => t.type === "ingreso" ? Number(t.amount) : t.type === "gasto" ? -Number(t.amount) : 0)))}</span></div>{tv(visible.length ? groupedRows(visible) : <Empty onAdd={newEntry} filtered={Boolean(query || filter !== "todos" || accountFilter || categoryFilter)} />)}</section></>}
{tab === "cuentas" && <><div className="section-actions accounts-heading"><p>{data.accounts.filter(account=>account.kind!=="Ahorro").length} {tr("cuentas ·")} {money(totalAmounts(balances.filter(account=>account.kind!=="Ahorro").map(account=>account.balance)))}</p><button className="secondary" onClick={() => setEditor({kind:"account"})}><Plus size={18}/>{tr("Añadir cuenta")}</button></div><div className="accounts-grid">{balances.filter(account=>account.kind!=="Ahorro").map(account => { const Icon = account.kind === "Ahorro" ? PiggyBank : account.kind === "Banco" ? Landmark : account.kind === "Cripto" ? Bitcoin : Banknote; const tone = account.kind === "Ahorro" ? "green" : account.kind === "Cripto" ? "gold" : account.kind === "Efectivo" ? "orange" : "blue"; return <article className="panel account" key={account.id}><div className="account-top"><span className={`stat-icon ${tone}`}><Icon size={23}/></span><div className="row-actions"><button className="icon-button" aria-label={tr("Editar {0}",{0:account.name})} onClick={() => setEditor({kind:"account",value:account})}><Pencil size={17}/></button><button className="icon-button danger" aria-label={tr("Eliminar {0}",{0:account.name})} onClick={() => setDeleting({table:"luden_accounts",key:"id",value:account.id,label:account.name})}><Trash2 size={17}/></button></div><button className="icon-button mobile-account-actions" aria-label={tr("Opciones de {0}",{0:account.name})} onClick={() => setAccountActions(account)}><MoreHorizontal size={22}/></button></div><span>{tv(account.kind)}</span><h2><button className="account-detail-link" onClick={() => setAccountDetail(account.id)}>{tv(account.name)}<ChevronRight size={16}/></button></h2><strong>{money(account.balance)}</strong></article> })}<article className="panel account"><div className="account-top"><span className="stat-icon gold"><PiggyBank size={23} aria-hidden="true"/></span></div><span>{tr("Ahorro")}</span><h2><button className="account-detail-link" onClick={() => {setError("");setSavingsOpen(true);}}>{tr("Total ahorro")}<ChevronRight size={16} aria-hidden="true"/></button></h2><strong>{money(savings)}</strong></article></div><p className="help">{tr("Tus cuentas de ahorro están en «Organizar mi ahorro». El saldo se actualiza al crear, editar o eliminar movimientos. Para borrar una cuenta, primero reasigna sus movimientos.")}</p></>}
      {tab === "deudas" && <><div className="debt-summary"><article className="debt-total owed"><span>{tr("Te deben")}</span><strong>{money(debtSummary.receivable)}</strong></article><article className="debt-total owing"><span>{tr("Debes")}</span><strong>{money(debtSummary.payable)}</strong></article><button className="primary" onClick={() => setEditor({kind:"debt"})}><Plus size={18}/>{tr("Añadir deuda")}</button></div><div className="debt-tools"><button className="secondary" aria-label={tr("Configurar avisos de dinero")} title={tr("Avisos de dinero")} onClick={()=>setFinanceNotificationsOpen(true)}><Bell size={18}/><span>{tr("Avisos")}</span></button><div className="debt-view-switch" role="group" aria-label={tr("Estado de las deudas")}><button aria-pressed={debtView === "pending"} onClick={() => setDebtView("pending")}>{tr("Pendientes")} <span>{pendingDebts.length}</span></button><button aria-pressed={debtView === "history"} onClick={() => setDebtView("history")}>{tr("Historial")} <span>{settledDebts.length}</span></button></div></div>{tv(displayedDebts.length ? <div className="debt-list">{displayedDebts.map(debt => { const progress = debtProgress(debt); const overdue = progress.remaining > 0 && Boolean(debt.due_date && debt.due_date < today()); return <article className="panel debt-card debt-readable" key={debt.id}><div className="debt-heading">{overdue && <span className="debt-overdue">{tr("Vencida")}</span>}<span className={`debt-direction ${debt.direction}`}>{tv(progress.remaining <= 0.005 ? (debt.direction === "me_deben" ? tr("Cobrada") : tr("Pagada")) : (debt.direction === "me_deben" ? tr("Te deben") : tr("Debes")))}</span><div className="row-actions"><button className="icon-button" aria-label={tr("Editar deuda de {0}: {1}",{0:debt.person,1:debt.title})} onClick={() => setEditor({kind:"debt",value:debt})}><Pencil size={17}/></button><button className="icon-button danger" aria-label={tr("Eliminar deuda de {0}: {1}",{0:debt.person,1:debt.title})} onClick={() => setDeleting({table:"luden_debts",key:"id",value:debt.id,label:debt.title})}><Trash2 size={17}/></button></div></div><div className="debt-main"><div><div className="debt-person"><span className="debt-avatar" aria-hidden="true">{debt.person.trim().slice(0,2).toLocaleUpperCase(locale())}</span><h2>{tv(debt.person)}</h2></div><p className="debt-purpose">{tv(debt.title)}</p></div><strong>{money(progress.remaining)} <small>{tv(progress.remaining > 0 ? (debt.direction === "me_deben" ? tr("Por cobrar") : tr("Por pagar")) : tr("Saldada"))}</small></strong></div><div className="debt-numbers"><span>{tv(debt.direction === "me_deben" ? tr("Cobrado") : tr("Pagado"))}<strong>{money(progress.paid)}</strong></span><span>{tr("Total")}<strong>{money(Number(debt.total))}</strong></span><span>{Math.round(progress.percent)}%</span></div><Progress value={progress.paid} max={Number(debt.total)} label={debt.direction === "me_deben" ? tr("Deuda cobrada") : tr("Deuda pagada")}/><p className="debt-terms">{tv(debt.payment_type === "Único" ? tr("Pago único") : debt.payment_type)}{!debt.due_date && tr(" · Sin fecha límite")}</p><div className="debt-footer"><span>{tv(debt.due_date ? tr("Vence {0}",{0:new Date(debt.due_date+"T12:00:00").toLocaleDateString(locale(),{day:"numeric",month:"short",year:"numeric"})}) : tr("Desde {0}",{0:new Date(debt.start_date+"T12:00:00").toLocaleDateString(locale(),{day:"numeric",month:"short",year:"numeric"})}))}</span>{progress.remaining > 0 && <div className="debt-payment-actions"><button className="secondary" onClick={() => setEditor({kind:"debtPayment",debt})}><Plus size={16}/>{tv(debt.direction === "me_deben" ? tr("Registrar cobro") : tr("Registrar pago"))}</button><button className="text-button" onClick={() => setEditor({kind:"debtPayment",debt,settle:true})}>{tr("Saldar deuda")}<Check size={16}/></button></div>}</div>{debt.notes && <p className="help">{tv(debt.notes)}</p>}{data.debtPayments.some(p => p.debt_id === debt.id) && <details className="debt-history"><summary>{tr("Ver pagos (")}{data.debtPayments.filter(p => p.debt_id === debt.id).length})</summary>{data.debtPayments.filter(p => p.debt_id === debt.id).sort((a,b) => b.date.localeCompare(a.date)).map(payment => <div className="debt-payment" key={payment.id}><span>{new Date(payment.date+"T12:00:00").toLocaleDateString(locale(),{day:"numeric",month:"short"})}{tv(payment.account_id ? ` · ${data.accounts.find(a => a.id === payment.account_id)?.name || tr("Cuenta eliminada")}` : tr(" · Sin cuenta; asígnala"))}{tv(debtPaymentDetails(payment.notes).category !== "Deudas" ? ` · ${debtPaymentDetails(payment.notes).category === PROJECT_CATEGORY ? projectName : debtPaymentDetails(payment.notes).category}` : "")}{tv(debtPaymentDetails(payment.notes).note ? ` · ${debtPaymentDetails(payment.notes).note}` : "")}</span><strong>{money(Number(payment.amount))}</strong><button className="icon-button" aria-label={tr("Editar pago")} onClick={() => setEditor({kind:"debtPayment",debt,value:payment})}><Pencil size={15}/></button><button className="icon-button danger" aria-label={tr("Eliminar pago")} onClick={() => setDeleting({table:"luden_debt_payments",key:"id",value:payment.id,label:tr("pago de {0}",{0:money(Number(payment.amount))})})}><Trash2 size={15}/></button></div>)}</details>}</article> })}</div> : <section className="panel empty"><HandCoins size={32}/><h2>{tv(debtView === "history" ? tr("Sin deudas saldadas") : tr("Sin deudas pendientes"))}</h2><p>{tv(debtView === "history" ? tr("Las deudas cobradas o pagadas por completo aparecerán aquí con sus pagos.") : tr("Aquí aparecen las deudas que todavía tienes que cobrar o pagar."))}</p></section>)}</>}
      {tab === "presupuestos" && <><ProjectSummary name={projectName} income={projectIncome} expenses={projectExpenses} limit={month ? projectLimit : 0} periodLabel={periodLabel} money={money} onEdit={() => setProjectOpen(true)} onDetails={() => setProjectDetail(true)}/><div className="section-actions"><p>{tr("Límites de")} {tv(budgetLabel)}{!month && <small className="period-explanation">{tr("El resumen muestra todo el historial; los límites corresponden al mes actual.")}</small>}</p><button className="secondary" onClick={() => setEditor({kind:"budget"})}><Plus size={18}/>{tr("Añadir límite")}</button></div><div className="budget-grid">{activeBudgets.map(b => <section className="panel budget" key={b.category}><div className="panel-heading"><h2>{tv(b.category)}</h2><div className="row-actions"><button className="icon-button" aria-label={tr("Editar límite {0}",{0:b.category})} onClick={() => setEditor({kind:"budget",value:b})}><Pencil size={17}/></button><button className="icon-button danger" aria-label={tr("Eliminar límite {0}",{0:b.category})} onClick={() => setDeleting({table:"luden_budgets",key:"category",value:b.category,label:b.category})}><Trash2 size={17}/></button></div></div><div className="panel-body"><strong>{money(spent(b.category))} <small>/ {money(Number(b.amount))}</small></strong><Progress value={spent(b.category)} max={Number(b.amount)}/><BudgetStatus used={spent(b.category)} limit={Number(b.amount)} money={money}/></div></section>)}</div>{!activeBudgets.length && <section className="panel empty"><Target size={30}/><h2>{tr("Sin límites guardados para este periodo")}</h2><p>{tr("El historial empieza cuando se guardan los límites. Puedes configurar este mes sin cambiar los anteriores.")}</p></section>}</>}
      {tab === "ajustes" && <div className="finance-settings-content">{profile?.id==='luden'&&<details className="settings-disclosure"><summary>{tr("Conectar Apple Pay")}<small>{tr("Registrar pagos con Atajos de iPhone")}</small></summary><ApplePaySetup/></details>}<section className="panel finance-notifications-launch"><button onClick={()=>setFinanceNotificationsOpen(true)}><span className="finance-bell"><Bell size={23}/></span><span><strong>{tr("Avisos de dinero")}</strong><small>{tr("Recordatorios de deudas pendientes")}</small></span><ChevronRight size={20}/></button></section><SettingsForm profileName={profile?.name||''} onLogout={async()=>{request.current++;setEditor(null);setDeleting(null);setProjectOpen(false);setAccountDetail(null);await fetch('/api/session',{method:'DELETE'});setData(null);setProfile(null);setAuthenticated(false);}} busy={busy} onExport={exportData} />{install?.available && <section className="panel install-settings"><div className="panel-heading"><h2>{tr("App para el móvil")}</h2><Smartphone size={19}/></div><div className="panel-body"><p>{tr("También puedes añadir luden a la pantalla de inicio.")}</p><button className="secondary" onClick={() => setInstallOpen(true)}>{tr("Ver cómo instalar")}</button></div></section>}</div>}
      </div>
    </main>
    <div className="day-mobile-nav"><AreaNav active="dinero"/></div>
    {savingsOpen&&<Dialog title={tr("Mi ahorro")} onClose={()=>{if(!busy)setSavingsOpen(false);}}><SavingsManager {...savingsProps} busy={busy} error={error} onDeposit={saveSavingsDeposit} onTarget={saveSavingsTarget} onTransfer={id=>{setSavingsOpen(false);setEditor({kind:'entry',draft:{id:'',title:'Traspaso de ahorro',type:'traspaso',amount:0,account_id:id,destination_account_id:data.accounts.find(account=>account.kind!=='Ahorro')?.id,date:today(),category:'Traspaso',micro:false}});}} onEditAccount={id=>{const account=data.accounts.find(row=>row.id===id);if(account){setSavingsOpen(false);setEditor({kind:'account',value:account});}}}/></Dialog>}
    {periodOpen&&<Dialog title={tr("Periodo")} onClose={()=>setPeriodOpen(false)}><form onSubmit={e=>{e.preventDefault();setPeriodOpen(false);}}><div className="period-month-list" role="group" aria-label={tr("Seleccionar periodo")}>{['',...[...new Set([month,...data.entries.map(entry=>entry.date.slice(0,7)),...Array.from({length:13},(_,index)=>shiftMonth(today().slice(0,7),-index))])].filter(Boolean).sort().reverse()].map(value=><button key={value||'all'} type="button" className="secondary" aria-pressed={month===value} onClick={()=>{setMonth(value);setPeriodOpen(false);}}><span>{tv(value?monthName(value):tr("Todo el historial"))}</span>{month===value&&<Check size={18}/>}</button>)}</div><details className="period-custom-month"><summary>{tr("Elegir otro mes")}</summary><label>{tr("Mes")}<input type="month" value={month||today().slice(0,7)} onChange={e=>setMonth(e.target.value)}/></label></details><div className="dialog-actions"><button className="primary">{tr("Listo")}</button></div></form></Dialog>}
    {recurringOpen&&<Dialog title={tr("Repeticiones")} onClose={()=>setRecurringOpen(false)}><section className="recurring-section"><div className="section-actions"><button className="secondary" onClick={() => {setRecurringOpen(false);setEditor(data.accounts.length ? {kind:"recurring"} : {kind:"account"});}}><Plus size={16}/>{tr("Añadir repetición")}</button></div>{recurringOpen && <div className="recurring-list">{tv(recurring.length ? recurring.map(item => <article key={item.key}><div><strong>{tv(item.title)}</strong><small>{money(item.amount)} {tr("· Día")} {tv(item.day)} · {tv(data.accounts.find(a => a.id === item.account_id)?.name || tr("Cuenta eliminada"))}</small><small>{tv(recurringRegistered(item) ? tr("Registrado este mes") : recurringDate(item)>today() ? tr("Próximo: {0}",{0:recurringDate(item)}) : tr("Pendiente de confirmar"))}</small></div><button className="secondary" disabled={recurringRegistered(item) || recurringDate(item)>today() || !data.accounts.some(a => a.id === item.account_id)} onClick={() => {setRecurringOpen(false);confirmRecurring(item);}}>{tr("Registrar este mes")}</button><button className="icon-button" aria-label={tr("Editar recurrente {0}",{0:item.title})} onClick={() => {setRecurringOpen(false);setEditor({kind:"recurring",value:item});}}><Pencil size={18}/></button><button className="icon-button danger" aria-label={tr("Eliminar recurrente {0}",{0:item.title})} onClick={() => {setRecurringOpen(false);setDeleting({table:"luden_budgets",key:"category",value:item.key,label:item.title});}}><Trash2 size={18}/></button></article>) : <p className="help">{tr("Añade gimnasio, suscripciones o nómina. Se guardan al confirmar cada mes.")}</p>)}</div>}</section></Dialog>}
    {entryActions && <Dialog title={tv(entryActions.title)} onClose={() => setEntryActions(null)}><div className="entry-action-list"><button className="secondary" onClick={() => { editEntry(entryActions); setEntryActions(null); }}><Pencil size={18}/>{tr("Editar movimiento")}</button><button className="secondary" onClick={() => duplicateEntry(entryActions)}><Repeat size={18}/>{tr("Duplicar movimiento")}</button><button className="secondary danger" onClick={() => { deleteEntry(entryActions); setEntryActions(null); }}><Trash2 size={18}/>{tr("Eliminar movimiento")}</button></div></Dialog>}
    {accountActions && <Dialog title={tv(accountActions.name)} onClose={() => setAccountActions(null)}><div className="entry-action-list"><button className="secondary" onClick={() => { setEditor({kind:"account",value:accountActions}); setAccountActions(null); }}><Pencil size={18}/>{tr("Editar cuenta")}</button><button className="secondary danger" onClick={() => { setDeleting({table:"luden_accounts",key:"id",value:accountActions.id,label:accountActions.name}); setAccountActions(null); }}><Trash2 size={18}/>{tr("Eliminar cuenta")}</button></div></Dialog>}
    {projectDetail && <Dialog fullScreen title={tv(projectName)} onClose={() => setProjectDetail(false)}><p className="help">{tv(periodLabel)} · {projectEntries.length} {tr("movimientos")}</p><ProjectSummary name={projectName} income={projectIncome} expenses={projectExpenses} limit={month ? projectLimit : 0} periodLabel={periodLabel} money={money} onEdit={() => {setProjectDetail(false);setProjectOpen(true);}}/><div className="project-ledger">{tv(projectEntries.length ? groupedRows(projectEntries) : <p className="help">{tr("No hay movimientos de este proyecto en el periodo elegido.")}</p>)}</div><button className="secondary" onClick={() => {setProjectDetail(false);setTab("movimientos");setCategoryFilter(PROJECT_CATEGORY);setAccountFilter("");setQuery("");setFilter("todos");}}>{tr("Ver en Movimientos")}<ChevronRight size={16}/></button></Dialog>}
    {accountView && <Dialog fullScreen title={tv(accountView.name)} onClose={() => setAccountDetail(null)}><section className="account-detail-summary"><span>{tr("Saldo actual · todo el historial")}</span><strong>{money(accountView.balance)}</strong><small>{tr("Movimientos:")} {tv(periodLabel)}</small><div><p>{tr("Ingresos")}<strong className="incoming">{money(totalAmounts(accountEntries.filter(e => e.type === "ingreso").map(e => e.amount)))}</strong></p><p>{tr("Gastos")}<strong>{money(totalAmounts(accountEntries.filter(e => e.type === "gasto").map(e => e.amount)))}</strong></p></div><small>{tr("Los traspasos aparecen en la lista y forman parte del saldo, pero no son ingresos ni gastos.")}</small></section><div className="detail-ledger">{tv(accountEntries.length ? groupedRows(accountEntries) : <p className="help">{tr("Sin movimientos de esta cuenta en el periodo elegido.")}</p>)}</div></Dialog>}
    {projectOpen && <Dialog title={tr("Personalizar proyecto")} onClose={() => { if (!busy) setProjectOpen(false) }}><form onSubmit={saveProject}><div className="form-fields"><label className="full">{tr("Nombre del proyecto")}<input name="project_name" defaultValue={projectName} maxLength={80} required autoFocus/></label><label className="full">{tr("Límite de gasto mensual (")}{tv(data.prefs.currency)})<AmountInput name="project_limit" defaultValue={projectLimit} required/></label></div><p className="help">{tr("Pon 0 si no quieres límite. Los ingresos, gastos y el beneficio se calculan con los movimientos de este proyecto.")}</p>{error && <p className="form-error" role="alert">{tv(error)}</p>}<div className="dialog-actions"><button className="secondary" type="button" disabled={busy} onClick={() => setProjectOpen(false)}>{tr("Cancelar")}</button><button className="primary" disabled={busy} type="submit">{tv(busy ? tr("Guardando…") : tr("Guardar"))}</button></div></form></Dialog>}
    {installOpen && install?.available && <Dialog title={tr("Añadir luden al móvil")} onClose={() => setInstallOpen(false)}><div className="install-steps"><p>{tr("Podrás seguir usando luden aquí sin instalarla.")}</p>{tv(install.ios ? <ol><li>{tr("Abre luden en Safari.")}</li><li>{tr("Pulsa Compartir y «Añadir a pantalla de inicio».")}</li><li>{tr("Activa «Abrir como app» si aparece y pulsa Añadir.")}</li></ol> : <><ol><li>{tr("Abre el menú del navegador.")}</li><li>{tr("Pulsa «Instalar aplicación» o «Añadir a pantalla de inicio».")}</li></ol>{prompt && <button className="primary" onClick={() => { void prompt.prompt(); setPrompt(null) }}>{tr("Instalar luden")}</button>}</>)}</div></Dialog>}
    {editor && <Dialog title={tv(editor.kind === "entry" ? (editor.value ? tr("Editar movimiento") : tr("Nuevo movimiento")) : editor.kind === "recurring" ? (editor.value ? tr("Editar recurrente") : tr("Nuevo recurrente")) : editor.kind === "account" ? (editor.value ? tr("Editar cuenta") : tr("Nueva cuenta")) : editor.kind === "budget" ? tr("Límite de gasto") : editor.kind === "debt" ? (editor.value ? tr("Editar deuda") : tr("Nueva deuda")) : editor.value ? tr("Editar pago de deuda") : editor.debt.direction === "me_deben" ? tr("Registrar cobro") : tr("Registrar pago"))} onClose={() => { if (!busy) setEditor(null) }}>
      <form onSubmit={saveEditor}><div className={editor.kind === "entry" ? "form-fields entry-form" : "form-fields"}>
      {editor.kind === "entry" && <EntryFields key={editor.value?.id || (editor.draft ? "duplicate" : "new")} entry={editor.value || editor.draft} linked={!!editor.value && !!managementLinks[editor.value.id]} accounts={data.accounts} currency={data.prefs.currency} projectName={projectName} lastAccount={lastAccount} recentEntries={data.entries}/>}
      {editor.kind === "recurring" && <><label className="full">{tr("Concepto")}<input name="title" maxLength={100} defaultValue={editor.value?.title} required/></label><label>{tr("Tipo")}<select name="type" defaultValue={editor.value?.type || "gasto"}><option value="gasto">{tr("Gasto")}</option><option value="ingreso">{tr("Ingreso")}</option></select></label><label>{tr("Importe")}<AmountInput name="amount" positive defaultValue={editor.value?.amount} required/></label><label>{tr("Cuenta")}<select name="account_id" defaultValue={editor.value?.account_id || lastAccount} required><option value="" disabled>{tr("Selecciona una cuenta")}</option>{data.accounts.map(a => <option key={a.id} value={a.id}>{tv(a.name)}</option>)}</select></label><label>{tr("Categoría")}<select name="category" defaultValue={editor.value?.category || "Suscripciones"}>{movementCategories.map(c => <option key={c} value={c}>{tv(c === PROJECT_CATEGORY ? projectName : c)}</option>)}</select></label><label>{tr("Día del mes")}<input name="day" type="number" min="1" max="31" defaultValue={editor.value?.day || 1} required/></label><label>{tr("Desde")}<input name="start" type="month" defaultValue={editor.value?.start || today().slice(0,7)} required/></label><p className="help full">{tr("Si el mes no tiene ese día, se usa el último. Siempre confirmarás el movimiento antes de guardarlo.")}</p></>}
      {editor.kind === "account" && <><label className="full">{tr("Nombre")}<input name="name" maxLength={80} defaultValue={editor.value?.name} required autoFocus/></label><label>{tr("Tipo")}<select name="kind" defaultValue={editor.value?.kind}><option>{tr("Banco")}</option><option>{tr("Efectivo")}</option><option>{tr("Cripto")}</option><option>{tr("Ahorro")}</option></select></label></>}
      {editor.kind === "budget" && <><label>{tr("Categoría")}<select name="category" defaultValue={editor.value?.category} aria-readonly={Boolean(editor.value)}>{(editor.value ? [editor.value.category] : expenseCategories).map(c => <option key={c}>{tv(c)}</option>)}</select></label><label>{tr("Límite mensual (")}{tv(data.prefs.currency)})<AmountInput name="amount" defaultValue={editor.value?.amount} required autoFocus/></label></>}
      {editor.kind === "debt" && <DebtFields key={editor.value?.id||'new'} debt={editor.value} currency={data.prefs.currency}/> }
      {editor.kind === "debtPayment" && <><div className="debt-payment-intro"><strong>{tv(editor.debt.title)}</strong><span>{tr("Pendiente:")} {money(debtProgress(editor.debt).remaining)}</span></div><label>{tr("Importe (")}{tv(data.prefs.currency)})<AmountInput name="amount" positive defaultValue={editor.value?.amount ?? (editor.settle ? debtProgress(editor.debt).remaining : undefined)} autoFocus required/></label><label>{tr("Fecha")}<input type="date" name="date" defaultValue={editor.value?.date || today()} required/></label><label>{tr("Cuenta")}<select name="account_id" defaultValue={editor.value?.account_id || (data.accounts.some(a => a.id === lastAccount) ? lastAccount : "")} required><option value="" disabled>{tr("Selecciona una cuenta")}</option>{data.accounts.map(a => <option key={a.id} value={a.id}>{tv(a.name)}</option>)}</select></label><label>{tr("Categoría")}<select name="category" defaultValue={debtPaymentDetails(editor.value?.notes).category}><option value="Deudas">{tr("Deudas (sin asignar)")}</option><option value={PROJECT_CATEGORY}>{tv(projectName)}</option>{debtPaymentCategories.map(category => <option key={category} value={category}>{tv(category)}</option>)}</select></label><label>{tr("Nota")}<input name="notes" maxLength={200} defaultValue={debtPaymentDetails(editor.value?.notes).note} placeholder={tr("Opcional")}/></label></>}
      </div>{error && <p className="form-error" role="alert">{tv(error)}</p>}<div className="dialog-actions"><button className="secondary" type="button" disabled={busy} onClick={() => setEditor(null)}>{tr("Cancelar")}</button><button className="primary" disabled={busy} type="submit">{tv(busy ? tr("Guardando…") : editor.kind === "entry" ? tr("Guardar movimiento") : editor.kind === "debt" ? tr("Guardar deuda") : tr("Guardar"))}</button></div></form>
    </Dialog>}
    {deleting && <Dialog title={tr("Eliminar registro")} onClose={() => { if (!busy) setDeleting(null) }}><p>{tr("¿Eliminar «")}{tv(deleting.label)}{tr("»? Esta acción no se puede deshacer.")}</p>{deleting.table === "luden_debts" && <p className="help">{tr("También se eliminarán sus pagos y los movimientos asociados; cambiarán los saldos de esas cuentas.")}</p>}{error && <p className="form-error" role="alert">{tv(error)}</p>}<div className="dialog-actions"><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>{tr("Cancelar")}</button><button className="primary destructive" disabled={busy} onClick={() => void save(async () => { if (deleting.table === "luden_budgets" && !String(deleting.value).startsWith("__aurum_")) {
        const result=await supabase.from("luden_budgets").upsert({category:MONTH_BUDGET_PREFIX+budgetMonth+":"+deleting.value,amount:0}).select();
        if(result.error)throw dbError(result.error);return;
      } if (deleting.table === "luden_accounts" && data.debtPayments.some(payment => payment.account_id === deleting.value)) throw new Error(tr("Esta cuenta tiene pagos de deudas. Reasígnalos a otra cuenta antes de eliminarla.")); const result = await supabase.from(deleting.table).delete().eq(deleting.key,deleting.value).select(); if (result.error) throw dbError(result.error); if (!result.data?.length) throw new Error(tr("El registro ya no existe. Sincroniza la página.")) }, "Eliminado")}>{tv(busy ? tr("Eliminando…") : tr("Eliminar"))}</button></div></Dialog>}
    {financeNotificationsOpen&&<Dialog title={tr("Avisos de dinero")} onClose={()=>{if(!notificationBusy)setFinanceNotificationsOpen(false);}}><FinanceNotifications onBusy={setNotificationBusy}/></Dialog>}
    {message && <div className="toast" role="status"><Check size={18}/>{tv(message)}</div>}
  </div>;
}

function ThemeControl({value,onChange}:{value:ThemeChoice;onChange:(theme:ThemeChoice)=>void}) {
  const Icon = value === "auto" ? Monitor : value === "dark" ? Moon : Sun;
  const labels = {dark:"Oscuro",light:"Claro",auto:"Automático"};
  return <details className="theme-menu" onKeyDown={e => { if(e.key === "Escape") e.currentTarget.removeAttribute("open"); }}><summary className="theme-control" aria-label={tr("Apariencia: {0}",{0:labels[value]})}><Icon size={18}/><span>{tv(labels[value])}</span></summary><div className="theme-options" role="group" aria-label={tr("Elegir apariencia")}>{(["dark","light","auto"] as const).map(theme => <button key={theme} type="button" aria-pressed={value === theme} onClick={e => {onChange(theme);e.currentTarget.closest("details")?.removeAttribute("open");}}>{tv(labels[theme])}{value === theme && <Check size={16}/>}</button>)}</div></details>;
}

function AmountInput({ name, defaultValue, allowNegative = false, positive = false, autoFocus = false, placeholder = "0,00" }: { name: string; defaultValue?: number; allowNegative?: boolean; positive?: boolean; autoFocus?: boolean; placeholder?: string; required?: boolean }) {
  const pattern = (allowNegative ? "-?" : "") + "(?:[0-9]{1,12}(?:[.,][0-9]{0,2})?|[.,][0-9]{1,2})";
  return <input name={name} type="text" inputMode="decimal" pattern={pattern} defaultValue={defaultValue} placeholder={tv(placeholder)} required autoFocus={autoFocus} onInput={event => {
    const input = event.currentTarget;
    input.setCustomValidity("");
    if (!input.value) return;
    try {
      const amount = parseAmount(input.value);
      if ((!allowNegative && amount < 0) || (positive && amount <= 0)) input.setCustomValidity(positive ? "Introduce un importe mayor que cero." : "Introduce un importe igual o mayor que cero.");
    } catch { input.setCustomValidity("Usa coma o punto y hasta dos decimales. Por ejemplo: 150,40."); }
  }} />;
}
function DebtFields({debt,currency}:{debt?:Debt;currency:string}){
  const [direction,setDirection]=useState<Debt['direction']>(debt?.direction||'me_deben');
  return <><fieldset className="debt-direction-picker full"><legend>{tr("¿Quién debe el dinero?")}</legend><input type="hidden" name="direction" value={direction}/><div className="debt-direction-options">{([{id:'me_deben',label:tr("Me deben")},{id:'debo',label:tr("Debo")}] as const).map(option=><button type="button" className="secondary" key={option.id} aria-pressed={direction===option.id} onClick={()=>setDirection(option.id)}>{tv(option.label)}</button>)}</div></fieldset><label className="full">{tr("Concepto")}<input name="title" maxLength={120} defaultValue={debt?.title} placeholder={tr("Préstamo, compra compartida…")} required autoFocus/></label><label className="full">{tv(direction==='me_deben'?tr("¿Quién te debe?"):tr("¿A quién debes?"))}<input name="person" maxLength={100} defaultValue={debt?.person} placeholder={tr("Nombre de la persona o entidad")} required/></label><label className="full debt-amount">{tr("Importe total (")}{tv(currency)})<AmountInput name="total" positive defaultValue={debt?.total} required/></label><details className="debt-options full" open={Boolean(debt?.due_date||debt?.notes||debt?.payment_type&&debt.payment_type!=='Único')||undefined} onInvalidCapture={e=>{e.currentTarget.open=true;}}><summary>{tr("Fechas y opciones")}</summary><div className="form-fields"><label className="full">{tr("Tipo de pago")}<select name="payment_type" defaultValue={debt?.payment_type||'Único'}>{['Único','Mensual','Semanal','Quincenal','Anual','A plazos','Flexible'].map(value=><option key={value}>{tv(value)}</option>)}</select></label><label>{tr("Fecha de inicio")}<input type="date" name="start_date" defaultValue={debt?.start_date||today()} required/></label><label>{tr("Fecha límite (opcional)")}<input type="date" name="due_date" defaultValue={debt?.due_date||''}/></label><label className="full">{tr("Notas")}<input name="notes" maxLength={500} defaultValue={debt?.notes} placeholder={tr("Detalles opcionales")}/></label></div></details></>;
}
function EntryFields({entry,linked=false,accounts,currency,projectName,lastAccount,recentEntries}:{entry?:Entry;linked?:boolean;accounts:Account[];currency:string;projectName:string;lastAccount:string;recentEntries:Entry[]}) {
  const [type,setType] = useState<Entry["type"]>(entry?.type || "gasto");
  const [transferScope,setTransferScope]=useState<'account'|'month'>('account');
  const [category,setCategory] = useState(entry?.category && entry.category !== "Traspaso" ? entry.category : entry?.type === "ingreso" ? "Nómina" : "Alimentación");
  const [date,setDate] = useState(entry?.date || today());
  const [categoryQuery,setCategoryQuery]=useState("");
  const categoryPicker=useRef<HTMLDetailsElement>(null);
  const [sourceAccount,setSourceAccount] = useState(entry?.account_id || accounts.find(a => a.id === lastAccount)?.id || accounts[0]?.id || "");
  const [destinationAccount,setDestinationAccount] = useState(entry?.destination_account_id || accounts.find(a => a.id !== (entry?.account_id || accounts[0]?.id))?.id || "");
  const previousDay = new Date(); previousDay.setDate(previousDay.getDate()-1);
  const yesterday = `${previousDay.getFullYear()}-${String(previousDay.getMonth()+1).padStart(2,"0")}-${String(previousDay.getDate()).padStart(2,"0")}`;
  const available = type === "ingreso" ? [PROJECT_CATEGORY,...incomeCategories] : [PROJECT_CATEGORY,...expenseCategories];
  const allCategories = available.includes(category) ? available : [category,...available];
  const recent=[...new Set(recentEntries.filter(item=>item.type===type).slice(0,20).map(item=>item.category))].filter(item=>allCategories.includes(item)).slice(0,4);
  const featured=[...new Set([...recent,...(type==='ingreso'?allCategories:[PROJECT_CATEGORY,'Alimentación','Supermercado','Restaurantes','Trabajo','Transporte','Ocio','Compras'])])].slice(0,8);
  function changeType(next:Entry["type"]) {
    setType(next);
    if (next === "ingreso" && category !== PROJECT_CATEGORY && !incomeCategories.includes(category)) setCategory("Nómina");
    if (next === "gasto" && category !== PROJECT_CATEGORY && !expenseCategories.includes(category)) setCategory("Alimentación");
  }
  const monthNow=today().slice(0,7);
  const monthTransfer=type==='traspaso'&&transferScope==='month';
  return <>
    <fieldset className="entry-type full"><legend>{tr("¿Qué quieres registrar?")}</legend><input type="hidden" name="type" value={type}/><div className="entry-type-options">{([{id:"gasto",label:tr("Gasto"),icon:ArrowUpRight},{id:"ingreso",label:tr("Ingreso"),icon:ArrowDownLeft},{id:"traspaso",label:tr("Traspaso"),icon:ArrowLeftRight}] as const).map(option => <button key={option.id} type="button" disabled={linked && type !== option.id} className={type === option.id ? "selected" : ""} aria-pressed={type === option.id} onClick={() => changeType(option.id)}><option.icon size={20}/><span>{tv(option.label)}</span></button>)}</div>{linked && <small>{tr("Vinculado a un pedido. No se puede cambiar el tipo de movimiento.")}</small>}</fieldset>
    <fieldset className="form-block full"><legend>{tr("Importe y concepto")}</legend><div className="form-fields">
    <label className="entry-amount full">{tr("Importe")}<div className="entry-money"><AmountInput name="amount" positive defaultValue={entry?.amount} placeholder="0,00" required autoFocus/><span>{tv(currency)}</span></div></label>
    {type==='traspaso'&&!entry&&<fieldset className="entry-type full"><legend>{tr("Tipo de traspaso")}</legend><input type="hidden" name="transfer_scope" value={transferScope}/><div className="entry-type-options"><button type="button" className={transferScope==='account'?'selected':''} aria-pressed={transferScope==='account'} onClick={()=>setTransferScope('account')}><WalletCards size={20}/><span>{tr("Entre cuentas")}</span></button><button type="button" className={transferScope==='month'?'selected':''} aria-pressed={transferScope==='month'} onClick={()=>setTransferScope('month')}><PiggyBank size={20}/><span>{tr("Entre meses")}</span></button></div></fieldset>}
    {!monthTransfer&&<label className="entry-concept full">{tr("Concepto")}<input name="title" maxLength={160} defaultValue={entry?.title} placeholder={tv(type === "ingreso" ? tr("Ej. nómina de septiembre") : type === "traspaso" ? tr("Ej. ahorro mensual") : tr("Ej. compra en supermercado"))} required/></label>}
    </div></fieldset>
    {type !== "traspaso" && <details className="entry-category-picker full" ref={categoryPicker}><summary><span>{tr("Categoría")}</span><strong>{tv(category===PROJECT_CATEGORY?projectName:category)}</strong><ChevronRight size={17}/></summary><input type="hidden" name="category" value={category}/><label className="category-search"><Search size={18}/><input type="search" aria-label={tr("Buscar categoría")} placeholder={tr("Buscar categoría…")} value={categoryQuery} onChange={e=>setCategoryQuery(e.target.value)}/></label>{!categoryQuery&&<p className="help">{tv(recent.length?tr("Recientes y habituales"):tr("Categorías habituales"))}</p>}<div className="entry-category-grid">{(categoryQuery?allCategories:featured).filter(item=>(item===PROJECT_CATEGORY?projectName:item).toLocaleLowerCase(locale()).includes(categoryQuery.toLocaleLowerCase(locale()))).map(item=>{const Icon=categoryIcons[item]||ReceiptText;return <button key={item} type="button" className={category===item?'selected':''} aria-pressed={category===item} onClick={()=>{setCategory(item);setCategoryQuery('');if(categoryPicker.current){categoryPicker.current.open=false;categoryPicker.current.querySelector('summary')?.focus();}}}><span className={`category-symbol category-symbol--${categoryTones[item]||"slate"}`} aria-hidden="true"><Icon size={18}/></span><span>{tv(item===PROJECT_CATEGORY?projectName:item)}</span></button>;})}</div>{!categoryQuery&&<label className="entry-category-more">{tr("Todas las categorías")}<select aria-label={tr("Todas las categorías")} value={category} onChange={e=>{setCategory(e.target.value);if(categoryPicker.current){categoryPicker.current.open=false;categoryPicker.current.querySelector('summary')?.focus();}}}>{allCategories.map(item=><option key={item} value={item}>{tv(item===PROJECT_CATEGORY?projectName:item)}</option>)}</select></label>}{categoryQuery&&!allCategories.some(item=>(item===PROJECT_CATEGORY?projectName:item).toLocaleLowerCase(locale()).includes(categoryQuery.toLocaleLowerCase(locale())))&&<p className="help" role="status">{tr("No hay categorías con ese nombre.")}</p>}</details>}

    <fieldset className="form-block full"><legend>{tv(monthTransfer?tr("Reparto del ahorro"):tr("Cuenta y fecha"))}</legend><div className="form-fields">
    {tv(monthTransfer?<><label className="full">{tr("Cuenta de ahorro")}<select name="savings_account" required>{accounts.filter(account=>account.kind==='Ahorro').map(account=><option key={account.id} value={account.id}>{tv(account.name)}</option>)}</select></label><label>{tr("Mes de origen")}<input name="source_month" type="month" defaultValue={monthNow} required/></label><label>{tr("Mes de destino")}<input name="destination_month" type="month" defaultValue={shiftMonth(monthNow,-1)} required/></label><p className="help full">{tr("Solo cambia el mes al que cuenta este ahorro. El dinero sigue en la misma cuenta y tu ahorro total no cambia.")}</p></>:<><label className={type === "traspaso" ? "" : "full"}>{tv(type === "traspaso" ? tr("Cuenta de origen") : tr("Cuenta"))}<select name="account_id" value={sourceAccount} onChange={event => { const next = event.target.value; setSourceAccount(next); if (next === destinationAccount) setDestinationAccount(accounts.find(a => a.id !== next)?.id || ""); }}>{accounts.map(a => <option key={a.id} value={a.id}>{tv(a.name)}</option>)}</select></label>{type === "traspaso" && <label>{tr("Cuenta de destino")}<select name="destination_account_id" value={destinationAccount} onChange={event => setDestinationAccount(event.target.value)} required><option value="" disabled>{tr("Selecciona otra cuenta")}</option>{accounts.filter(a => a.id !== sourceAccount).map(a => <option key={a.id} value={a.id}>{tv(a.name)}</option>)}</select></label>}{(accounts.find(account=>account.id===sourceAccount)?.kind==='Ahorro'||(type==='traspaso'&&accounts.find(account=>account.id===destinationAccount)?.kind==='Ahorro'))&&<label className="full">{tr("Mes de ahorro")}<input name="savings_month" type="month" defaultValue={entry?.savings_month||date.slice(0,7)} required/><small>{tr("Cuenta para este objetivo, aunque lo guardes antes.")}</small></label>}<fieldset className="entry-date full"><legend>{tr("Fecha")}</legend><div className="entry-date-controls"><button type="button" aria-pressed={date === today()} onClick={() => setDate(today())}>{tr("Hoy")}</button><button type="button" aria-pressed={date === yesterday} onClick={() => setDate(yesterday)}>{tr("Ayer")}</button><input name="date" type="date" aria-label={tr("Elegir fecha")} value={date} onChange={event => setDate(event.target.value)} required/></div></fieldset></>)}
    </div></fieldset>
    {type === "gasto" && <details className="entry-more full" open={entry?.micro||undefined}><summary>{tr("Más opciones")}</summary><label className="entry-micro full"><input type="checkbox" name="micro" defaultChecked={entry?.micro}/><span><strong>{tr("Gasto hormiga")}</strong><small>{tr("Compras pequeñas que quieras seguir de cerca.")}</small></span></label></details>}
  </>;
}
function ProjectSummary({name,income,expenses,limit,periodLabel,money,onEdit,onDetails,compact=false}:{name:string;income:number;expenses:number;limit:number;periodLabel:string;money:(value:number)=>string;onEdit:()=>void;onDetails?:()=>void;compact?:boolean}) {
  const profit = totalAmounts([income, -expenses]);
  return <section className={compact ? "project-summary project-summary-compact" : "panel project-summary"} aria-label={tr("Proyecto {0}",{0:name})}>
    <div className="project-heading"><span className="project-icon"><BriefcaseBusiness size={20}/></span><div><small>{tr("Proyecto ·")} {tv(periodLabel)}</small><h2>{tv(name)}</h2></div><button className="icon-button" aria-label={tr("Personalizar {0}",{0:name})} onClick={onEdit}><Pencil size={17}/></button></div>
    <div className="project-metrics"><div><span>{tr("Ingresos")}</span><strong className="incoming">{money(income)}</strong></div><div><span>{tr("Gastos")}</span><strong>{money(expenses)}</strong></div><div className="project-result"><span>{tv(profit < 0 ? tr("Pérdida") : tr("Beneficio"))}</span><strong className={profit < 0 ? "project-loss" : "incoming"}>{money(Math.abs(profit))}</strong></div></div>
    {limit > 0 && <div className="project-budget"><span>{tv(expenses > limit ? tr("Límite superado en {0}",{0:money(expenses-limit)}) : tr("{0} disponibles del límite",{0:money(limit-expenses)}))}</span><Progress value={expenses} max={limit}/></div>}
    {onDetails && <button className="text-button project-details-button" onClick={onDetails}>{tr("Ver movimientos y resultado")}<ChevronRight size={16}/></button>}

  </section>;
}
function Progress({value,max,label="Presupuesto utilizado"}:{value:number;max:number;label?:string}) { return <div className="progress" role="meter" aria-label={tv(label)} aria-valuemin={0} aria-valuemax={Math.max(max,1)} aria-valuenow={Math.min(Math.max(value,0),Math.max(max,1))}><i className={value > max ? "over" : ""} style={{width:`${max > 0 ? Math.min(100,value/max*100) : value > 0 ? 100 : 0}%`}}/></div> }
function Empty({onAdd,filtered=false}:{onAdd:()=>void;filtered?:boolean}) { return <div className="empty"><ReceiptText size={30}/><h2>{tv(filtered ? tr("Sin resultados") : tr("Sin movimientos en este periodo"))}</h2><p>{tv(filtered ? tr("Cambia la búsqueda o el filtro.") : tr("Registra un ingreso o gasto para empezar."))}</p>{!filtered && <button className="secondary" onClick={onAdd}><Plus size={17}/>{tr("Añadir movimiento")}</button>}</div> }
function Dialog({title,onClose,children,fullScreen=false}:{title:string;onClose:()=>void;children:ReactNode;fullScreen?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close() },[]);
  return <dialog ref={ref} className={`dialog app-form-sheet ${fullScreen ? "dialog-fullscreen" : ""}`} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose() }}><header><h2 id={titleId}>{tv(title)}</h2><button className="icon-button" aria-label={tr("Cerrar")} onClick={onClose}><X size={21}/></button></header>{children}</dialog>;
}
function SettingsForm({profileName,busy,onExport}:{profileName:string;onLogout:()=>void;busy:boolean;onExport:()=>Promise<void>}) {
  const [preparing,setPreparing]=useState(false);
  return <div className="settings-layout"><section className="panel"><div className="panel-heading"><h2>{tr("Perfil")} {tv(profileName)}</h2><span className="avatar">{profileName.slice(0,1)}</span></div><div className="panel-body"><strong>{tr("EUR · Euro (€)")}</strong><p className="help">{tr("Todos los importes se registran en euros.")}</p></div></section><section className="panel"><div className="panel-heading"><h2>{tr("Copia de seguridad")}</h2></div><div className="panel-body"><p>{tr("Todo tu perfil: cuentas, movimientos, ahorros, deudas, pedidos, Caja y rutinas con su historial.")}</p><p className="help">{tr("Archivo JSON privado. No incluye PIN ni claves de acceso. Guárdalo en un lugar seguro.")}</p><button className="secondary" disabled={busy||preparing} aria-busy={preparing} onClick={async()=>{if(preparing)return;setPreparing(true);try{await onExport();}finally{setPreparing(false);}}}>{tv(preparing?<LoaderCircle size={18} className="spin"/>:<Download size={18}/>)} {tv(preparing?tr("Preparando copia…"):tr("Descargar copia completa"))}</button></div></section><AccountSettings/></div>;
}

function BudgetStatus({used,limit,money}:{used:number;limit:number;money:(value:number)=>string}) {
  const exceeded=cents(used)>cents(limit), warning=!exceeded && limit>0 && used>=limit*.8;
  return <div className="budget-status"><small>{tv(exceeded ? tr("Exceso: {0}",{0:money(totalAmounts([used,-limit]))}) : tr("Disponible: {0}",{0:money(totalAmounts([limit,-used]))}))}</small>{(exceeded || warning) && <span className={exceeded ? "budget-alert exceeded" : "budget-alert warning"}>{tv(exceeded ? tr("Límite superado") : tr("Cerca del límite"))} · {tv(limit>0 ? Math.round(used/limit*100) : 100)}%</span>}</div>;
}
