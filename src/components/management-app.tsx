"use client";
import { t as tr, tv, locale } from "@/lib/i18n";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,

} from "react";
import Link from "next/link";
import {
  Archive,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  Landmark,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import AreaNav, {AppSidebar} from "./area-nav";
import OrderCases from './management-order-cases';
import OrderStatus from './management-order-status';
import AuthRedirect from "./auth-redirect";
import { LoadingSkeleton } from './loading-skeleton';
import {
  ManagementSheet,
  ItemForm,
  VintedSaleForm,
  EventForm,
  TransferForm,
} from "./management-forms";
import {
  acceptProfile,
  profileHeader,
  profileDisplayName,
} from "@/lib/profile-client";
import { accountChange, totalAmounts } from "@/lib/finance";
import {
  itemTotals,
  compareManagementItems,
  managementAmountLabel,
  orderHasBuyer,
  orderDelivered,
  orderShipped,
  isVintedOrder,
  orderPaymentState,
  orderVisualState,
  orderTotalCost,
  resolveManagementEvents,
  managementSummary,
  money,
  type ManagementData,
  type ManagementItem,
  type ManagementSnapshot,
  type ManagementEvent,
} from "@/lib/management";
import type { ImportRow } from "@/lib/management-import";

async function api(action?: string, payload?: unknown, query="",signal?:AbortSignal) {
  const response = await fetch("/api/management"+query, {
    method: action ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "x-aurum-profile": profileHeader(),
    },
    body: action ? JSON.stringify({ action, payload }) : undefined,
    cache: "no-store",
    signal,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "No se pudo completar la operación.");
  return result;
}
const dateLabel = (day: string) =>
  day
    ? new Date(day.slice(0, 10) + "T12:00:00").toLocaleDateString(locale(), {
        day: "numeric",
        month: "short",
      })
    : "Sin fecha";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
const eventNames: Record<string, string> = {
  compra: "Compra pagada",
  gasto: "Gasto adicional",
  cobro: "Cobro",
  reembolso_proveedor: "Reembolso recibido",
  devolucion_cliente: "Devolución pagada",
  aportacion: "Aportación",
  recuperacion: "Recuperación",
  nota: "Nota",
  incidencia: "Incidencia",
  estado: "Actualización",
  anulacion: "Anulación",
  traspaso: "Traspaso",
};
type PreviewRow = ImportRow & { imported?: boolean };
type Editor =
  | { type: "item"; item?: ManagementItem }
  | { type: "sale"; item: ManagementItem }
  | { type: "cash"; movement: ManagementSnapshot["movements"][number] }
  | { type: "event"; item: ManagementItem; kind: string }
  | { type: "transfer"; deposit?: boolean }
  | null;
export default function ManagementApp() {
  const [data, setData] = useState<ManagementSnapshot | null>(null),
    [auth, setAuth] = useState<boolean | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  useEffect(()=>{
    if(!notice)return;
    const timer=setTimeout(()=>setNotice(''),2000);
    return()=>clearTimeout(timer);
  },[notice]);
  const
    [tab, setTab] = useState("ventas"),
    [query, setQuery] = useState(""),
    [view, setView] = useState("todos");
  const [person, setPerson] = useState(""),
    [month, setMonth] = useState(""),
    [archived, setArchived] = useState(false);
  const [purposeFilter,setPurposeFilter]=useState('todos');
  const [showEmail,setShowEmail]=useState(false);
  const readRequest=useRef(0);
  const revision=useRef<string|null>(null);
  const [history,setHistory]=useState<{key:string;events:ManagementEvent[]}|null>(null);
  const [historyError,setHistoryError]=useState<{key:string;message:string}|null>(null);
  const [historyRetry,setHistoryRetry]=useState(0);
  const [groupBy, setGroupBy] = useState('none');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [undoAction,setUndoAction]=useState<{title:string;message:string;run:()=>Promise<void>}|null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cardLayout, setCardLayout] = useState(false);
  const [editor, setEditor] = useState<Editor>(null),
    [selected, setSelected] = useState<string | null>(null),
    [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [voiding, setVoiding] = useState<ManagementEvent | null>(null),
    [voidKey, setVoidKey] = useState("");
  const fileRef = useRef<HTMLInputElement>(null),
    lock = useRef(false);
  const load = useCallback(async (quiet=false) => {
    const request=++readRequest.current;
    if(!quiet)setLoading(true);
    try {
      if(quiet&&revision.current!==null){
        const latest=await api(undefined,undefined,'?revision=1');
        if(request!==readRequest.current)return;
        if(String(latest.revision)===revision.current){setError('');return;}
      }
      const result = await api();
      if(request!==readRequest.current)return;
      revision.current=result.revision==null?null:String(result.revision);
      setData(result);
      setError("");
    } catch (e) {
      if(request===readRequest.current)setError((e as Error).message);
    } finally {
      if(request===readRequest.current)setLoading(false);
    }
  }, []);
  useEffect(() => {
    const theme = localStorage.getItem("aurum-theme") || "auto";
    document.documentElement.dataset.theme =
      theme === "auto"
        ? matchMedia("(prefers-color-scheme:dark)").matches
          ? "dark"
          : "light"
        : theme;
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (s) => {
        if (!active) return;
        setAuth(s.authenticated);
        if (s.profile) {
          acceptProfile(s.profile);
            const id = new URLSearchParams(location.search).get("item");
            if (id) setSelected(id);
          await load();
        }
      })
      .catch(() => {
        if (active) {
          setAuth(false);
          setError(tr("No se pudo comprobar la sesión."));
        }
      });
    return () => {
      active = false;
    };
  }, [load]);
  useEffect(() => {
    if (!auth) return;
    const refresh = () => {
      if (document.visibilityState === "visible" && !lock.current&&!editor&&!preview&&!undoAction) void load(true);
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus",refresh);
    const interval=setInterval(refresh,15000);
    return () => {document.removeEventListener("visibilitychange",refresh);window.removeEventListener("focus",refresh);clearInterval(interval);};
  }, [auth,load,editor,preview,undoAction]);
  async function mutate(
    action: string,
    payload: unknown,
    message = "Guardado",
  ) {
    if (lock.current) return;
    lock.current = true;
    setNotice('');
    setBusy(true);
    setError("");
    try {
      await api(action, payload);
      await load();
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function importFile(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/management", {
        method: "POST",
        headers: { "x-aurum-profile": profileHeader() },
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPreview(body.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const current = data?.items.find((i) => i.id === selected);
  const historyKey=JSON.stringify([selected,current?.updated_at,data?.revision,historyRetry]);
  useEffect(()=>{
    if(!selected)return;
    const controller=new AbortController();
    api(undefined,undefined,'?history='+encodeURIComponent(selected),controller.signal)
      .then(result=>{if(!controller.signal.aborted){setHistory({key:historyKey,events:result.events});setHistoryError(null);}})
      .catch(error=>{if(!controller.signal.aborted)setHistoryError({key:historyKey,message:(error as Error).message});});
    return ()=>controller.abort();
  },[selected,historyKey]);
  const activeEvents = useMemo(() => {
    return data?resolveManagementEvents(data):[];
  }, [data]);
  const historyEvents=data&&history?.key===historyKey?resolveManagementEvents(data,history.events):[];
  const summary = useMemo(
    () => (data ? managementSummary(data.items, activeEvents) : null),
    [data, activeEvents],
  );
  const filtered = useMemo(() => {
    if (!data) return [];
    const normalized = query.toLocaleLowerCase(locale());
    return data.items.filter((item) => {
      const d = item.data,
        t = itemTotals(item, activeEvents);
      if (item.archived !== archived || d.activity !== tab) return false;
      if(tab==='ventas'&&purposeFilter==='personal'&&d.sale!=='Para mí')return false;
      if(tab==='ventas'&&purposeFilter==='vinted'&&d.sale==='Para mí')return false;
      if (person && d.person !== person) return false;
      if (month && !(d.purchase_date || d.sale_date || "").startsWith(month))
        return false;
      if (
        normalized &&
        ![
          d.model,
          d.color,
          d.size,
          d.person,
          d.email,
          d.package_name||'',
          d.order_ref,
          d.next_action,
        ]
          .join(" ")
          .toLocaleLowerCase(locale())
          .includes(normalized)
      )
        return false;
      if (view === "por-pedir" && d.tracking !== "Por pedir") return false;
      if(view==='por-revisar'&&d.tracking!=='Por revisar'&&d.sale!=='Por revisar')return false;
      if (view === "en-camino" && !["Pedido", "En camino"].includes(d.tracking))
        return false;
      if (view === "en-casa" && d.tracking !== "En casa") return false;
      if (
        view === "por-entregar" &&
        ((isVintedOrder(d)?orderShipped(d):orderDelivered(d)) ||
          d.tracking === "Cancelado" ||
          !orderHasBuyer(d))
      )
        return false;
      if (
        view === "por-cobrar" &&
        (d.sale === "Disponible" || t.remaining <= 0)
      )
        return false;
      if (view === "incidencias" && !t.unresolved.length) return false;
      if(view==='reembolsos'&&(!d.refund_status||d.refund_status==='none'))return false;
      if(view==='intercambios'&&(!d.exchange_status||d.exchange_status==='none'))return false;
      if (
        view === "tareas" &&
        (!d.next_action || (!!d.review_date && d.review_date > today()))
      )
        return false;
      return true;
    }).sort(compareManagementItems);
  }, [data, tab, query, view, person, month, archived, activeEvents,purposeFilter]);
  const grouped = useMemo(() => {
    const groups = new Map<string, ManagementItem[]>();
    for (const item of filtered) {
      const d = item.data;
      const key = groupBy === 'person' ? d.person || (d.sale==='Para mí'?'Para mí':'Sin comprador asignado')
        : groupBy === 'status' ? d.tracking
        : groupBy === 'origin' ? d.source_sheet || 'Añadidos en la web' : '';
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    return Array.from(groups, ([heading, items]) => items.map((item, index) => ({item, heading: index === 0 ? heading : '', count: items.length}))).flat();
  }, [filtered, groupBy]);
  if (auth === null)
    return (
      <main className="skeleton-screen">
        <LoadingSkeleton label={tr("Cargando Gestiones…")} />
      </main>
    );
  if (!auth) return <AuthRedirect />;
  const businessAccounts =
    data?.accounts.filter((a) => a.scope === "business") || [];
  const personalDebtEntries =
    data?.debtPayments.flatMap((p) => {
      const debt = data.debts.find((d) => d.id === p.debt_id);
      return debt && p.account_id
        ? [
            {
              ...p,
              type:
                debt.direction === "me_deben"
                  ? ("ingreso" as const)
                  : ("gasto" as const),
            },
          ]
        : [];
    }) || [];
  const businessBalance = (id: string) =>
    data
      ? accountChange(
          [
            ...data.movements.map((m) => ({
              ...m,
              amount: Number(m.amount),
              type: m.type as "ingreso" | "gasto" | "traspaso",
            })),
            ...personalDebtEntries.map((p) => ({
              ...p,
              amount: Number(p.amount),
            })),
          ],
          id,
        )
      : 0;
  const openEvent = (item: ManagementItem, kind: string) => {
    setEditor({ type: "event", item, kind });
    setError("");
  };
  async function quickState(item: ManagementItem, state: string) {
    const dates =
      state === "En casa"
        ? { arrival_date: today() }
        : state === "Entregado"
          ? { delivery_date: today() }
          : {};
    await mutate(
      "save",
      {
        id: item.id,
        version: item.version,
        data: { ...item.data, tracking: state, ...dates,...(isVintedOrder(item.data)&&state!=='Cancelado'?{shipping_status:state==='Enviado'?'sent':'pending',shipping_date:state==='Enviado'?(item.data.shipping_date||today()):'',...(state==='Enviado'?{sale:'Vendido'}:{})}:{}) },
        previous: item.data,
      },
      "Seguimiento actualizado",
    );
  }
  type Stage='none'|'pedido'|'casa'|'final';
  const needsVintedSale=(item:ManagementItem)=>isVintedOrder(item.data)&&(item.data.sale!=='Vendido'||item.data.price<=0);
  const collectionLabel=(item:ManagementItem)=>orderPaymentState(item,activeEvents)==='paid'?'Cobrado · Deshacer':isVintedOrder(item.data)?needsVintedSale(item)?'Marcar vendido':'Vendido · Confirmar cobro':'Registrar cobro';
  const collectionDisabled=(item:ManagementItem)=>item.data.tracking==='Cancelado'||(!isVintedOrder(item.data)&&orderPaymentState(item,activeEvents)!=='paid'&&['cancelled','no-price','no-buyer','review'].includes(orderPaymentState(item,activeEvents)));
  function collectOrSell(item:ManagementItem){
    if(orderPaymentState(item,activeEvents)==='paid'){
      const receipt=activeEvents.filter(event=>event.item_id===item.id&&event.kind==='cobro'&&!event.voided).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
      if(receipt){setError('');setVoiding(receipt);setVoidKey(crypto.randomUUID());}else setError(tr("Abre el historial del pedido para revisar su cobro."));return;
    }
    if(needsVintedSale(item)){setError('');setEditor({type:'sale',item});}else openEvent(item,'cobro');
  }
  function currentStage(item:ManagementItem):Stage{
    const d=item.data;
    if(isVintedOrder(d)&&orderShipped(d)||d.activity==='amigos'&&orderDelivered(d))return 'final';
    if(d.sale==='Para mí'&&orderDelivered(d)||['En casa','Entregado'].includes(d.tracking))return 'casa';
    return ['Por pedir','Por revisar'].includes(d.tracking)?'none':'pedido';
  }
  async function saveStage(item:ManagementItem,target:Stage){
    const d=item.data;
    if(target==='final'&&isVintedOrder(d)&&needsVintedSale(item)){setEditor({type:'sale',item});return;}
    const next:ManagementData={...d,tracking:target==='none'?'Por pedir':target==='pedido'?'Pedido':target==='final'?(isVintedOrder(d)?'Enviado':'Entregado'):'En casa',arrival_date:target==='casa'||target==='final'?(d.arrival_date||today()):'',delivery_status:d.sale==='Para mí'&&target==='casa'||d.activity==='amigos'&&target==='final'?'delivered':'pending',delivery_date:d.sale==='Para mí'&&target==='casa'||d.activity==='amigos'&&target==='final'?(d.delivery_date||today()):''};
    if(isVintedOrder(d)){next.shipping_status=target==='final'?'sent':'pending';next.shipping_date=target==='final'?(d.shipping_date||today()):'';next.sale=target==='final'?'Vendido':d.sale==='Vendido'?'Disponible':d.sale;if(target!=='final'&&d.sale==='Vendido')next.sale_date='';}
    await mutate('save',{id:item.id,version:item.version,previous:d,data:next},'Estado del pedido actualizado');
  }
  function requestStage(item:ManagementItem,clicked:Stage){
    if(clicked==='final'&&isVintedOrder(item.data)&&currentStage(item)==='final'){collectOrSell(item);return;}
    const current=currentStage(item),rank={none:0,pedido:1,casa:2,final:3};
    const target=clicked===current?(current==='final'?'casa':current==='casa'?'pedido':'none'):clicked;
    if(rank[target]<rank[current]){
      setError('');setUndoAction({title:isVintedOrder(item.data)&&current==='final'?'¿Deshacer vendido y enviado?':'¿Deshacer este estado?',message:`«${item.data.model}» volverá a ${target==='none'?'Por pedir':target==='pedido'?'Pedido':'En casa'}. Los cobros registrados se conservan; puedes anularlos por separado.`,run:()=>saveStage(item,target)});
    }else void saveStage(item,target).catch(()=>{});
  }
  function renderStageControl(item:ManagementItem){
    const d=item.data,stage=currentStage(item),vinted=isVintedOrder(d);
    const steps:Array<[Stage,string]>=d.sale==='Para mí'?[['pedido','Pedido'],['casa','En casa']]:[['pedido','Pedido'],['casa','En casa'],['final',vinted?(stage==='final'?collectionLabel(item):'Vendido'):'Entregado']];
    return <details className="mg-stage-disclosure" open={d.refund_status==='requested'||d.exchange_status==='requested'||undefined}><summary>{tr("Estado")}</summary><div className="mg-stage-controls" role="group" aria-label={tr("Cambiar estado del pedido")}>{steps.map(([key,label])=><button key={key} className="mg-stage-button" aria-pressed={stage===key} disabled={busy||item.archived||d.tracking==='Cancelado'} title={tv(key==='final'&&vinted?tr("Registrar venta o confirmar el dinero recibido"):stage===key?tr("Pulsa para deshacer este estado"):label)} onClick={()=>requestStage(item,key)}>{tv(stage===key?<Check size={15}/>:null)}{tv(label)}</button>)}</div>{d.sale!=='Para mí'&&<button className="secondary mg-cash-action" aria-pressed={orderPaymentState(item,activeEvents)==='paid'} disabled={busy||item.archived||collectionDisabled(item)} onClick={()=>collectOrSell(item)}><ArrowDownLeft size={16}/>{collectionLabel(item)}</button>}{vinted&&stage==='final'&&<p className="mg-stage-help">{tr("La venta no suma dinero a Caja hasta confirmar el cobro. Para deshacer la venta, selecciona En casa.")}</p>}<section className="mg-state-cases"><h4>{tr("Reembolso e intercambio")}</h4><OrderCases item={item} busy={busy} receivedAmount={itemTotals(item,activeEvents).returned} onRegisterRefund={()=>openEvent(item,'reembolso_proveedor')} onChange={(kind,status)=>changeCase(item,kind,status)}/></section></details>;
  }

  const counts = (id: string) =>
    data?.items.filter((i) => !i.archived && i.data.activity === id).length ||
    0;
  const changeCase=(item:ManagementItem,case_type:'refund'|'exchange',status:string)=>{
    const run=async()=>{await mutate('case_status',{id:item.id,case_type,status,request_id:crypto.randomUUID()},status==='received'?tr('Reembolso recibido · coste total {0}',{0:money(orderTotalCost({...item.data,cost:3.7}))}):'Estado actualizado');};
    const previous=case_type==='refund'?item.data.refund_status:item.data.exchange_status;
    const undo=status==='none'||case_type==='refund'&&previous==='received'&&status==='requested'||case_type==='exchange'&&previous==='completed'&&status==='requested';
    if(undo){setError('');setUndoAction({title:'¿Deshacer este cambio?',message:case_type==='refund'&&previous==='received'?'Se desmarcará el reembolso recibido y se restaurará el coste anterior del artículo. Los ingresos registrados en Caja se conservan.':'Se desmarcará este estado del pedido. El historial y los movimientos de dinero se conservan.',run});}else void run().catch(()=>{});
  };

  return (
    <div className="mg-app">
      <AppSidebar active="gestiones" profileName={profileDisplayName()}/>
      <a className="mg-skip" href="#management-content">{tr("Saltar al contenido")}</a>
      <main className="mg-workspace" id="management-content">
        <header className="mg-header">
          <div>
            <span className="mg-eyebrow">{tr("Tu actividad")}</span>
            <h1>{tr("Gestiones")}</h1>
          </div>
          <div>
            <button
              aria-label={tr("Actualizar gestiones")}
              disabled={loading || busy}
              onClick={() => void load()}
            >
              <RefreshCw size={20} className={loading ? "mg-spin" : ""} />
            </button>
            <button
              className="primary"
              disabled={busy || !data || (tab==='caja'&&!businessAccounts.length)}
              onClick={() => setEditor(tab==='caja'?{type:'transfer',deposit:true}:{ type: "item" })}
            >
              <Plus size={20} />
              <span>{tv(tab==='caja'?tr("Dinero"):tr("Añadir"))}</span>
            </button>
          </div>
        </header>
        {error && (
          <div className="mg-error" role="alert">
            {tv(error)}
            <button aria-label={tr("Cerrar error")} onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        {notice && (
          <div className="mg-notice" role="status">
            <Check size={18} />
            {tv(notice)}
            <button aria-label={tr("Cerrar aviso")} onClick={() => setNotice("")}>
              <X size={18} />
            </button>
          </div>
        )}
        {tv(!data ? loading ? (
          <LoadingSkeleton label={tr("Cargando tus gestiones…")} variant="list" />
        ) : (
          <section className="mg-empty">
            <Package size={36} />
            <h2>{tr("No se pudieron cargar tus gestiones")}</h2>
            <button className="secondary" onClick={() => void load()}>
              {tr("Volver a intentar")}</button>
          </section>
        ) : (
          <>
            {!businessAccounts.length&&tab!=='caja'&&<div className="mg-information"><strong>{tr("Prepara la caja de ventas")}</strong><p>{tr("Crea Efectivo y Banco para registrar pagos y cobros.")}</p><button className="secondary" disabled={busy} onClick={()=>void mutate('setup',{},'Caja preparada').catch(()=>{})}><WalletCards size={18}/>{tr("Crear caja de ventas")}</button></div>}
            <nav className="mg-tabs" aria-label={tr("Actividad")}>
              {[
                ["ventas", "Pedidos"],
                ["amigos", "Amigos"],
                ["bonos", "Bonos"],
                ["caja", "Caja"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  onClick={() => {
                    setPurposeFilter("todos");
                    setTab(id);
                    setView("todos");
                    setPerson("");
                    setMonth("");
                  }}
                >
                  <span>{tv(label)}</span>
                  {id !== "caja" && <small>{counts(id)}</small>}
                </button>
              ))}
            </nav>
            {tab==='ventas'&&<div className="mg-purpose-filter" role="group" aria-label={tr("Destino del pedido")}>{[['todos','Todos'],['personal','Para mí'],['vinted','Para Vinted']].map(([key,label])=><button key={key} aria-pressed={purposeFilter===key} onClick={()=>setPurposeFilter(key)}>{tv(label)}</button>)}</div>}
            
            {tv(tab === "caja" ? (
              <>
                <section className="mg-cash-heading">
                  <div>
                    <h2>{tr("Caja de pedidos")}</h2>
                    <p>{tr("Dinero de tus pedidos: para ti, Vinted y amigos. El teléfono se paga aparte.")}</p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => setEditor({ type: "transfer", deposit:true })}
                    disabled={busy||!businessAccounts.length}
                  >
                    <Plus size={18}/>
                    {tr("Añadir dinero")}</button>
                  <button
                    className="secondary"
                    onClick={() => setEditor({ type: "transfer" })}
                    disabled={!businessAccounts.length}
                  >
                    <ArrowLeftRight size={18} />
                    {tr("Traspasar")}</button>
                </section>
                {tv(businessAccounts.length ? (
                  <div className="mg-cash-cards">
                    {businessAccounts.map((a) => (
                      <article key={a.id}>
                        <span className="mg-icon">
                          {tv(a.kind === "Efectivo" ? <Banknote /> : <Landmark />)}
                        </span>
                        <span>
                          {tv(a.kind === "Efectivo" ? tr("Efectivo") : tr("Banco"))}
                        </span>
                        <strong>{money(businessBalance(a.id))}</strong>
                        <small>{tv(a.name)}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <section className="mg-empty">
                    <WalletCards size={32} />
                    <h2>{tr("Prepara tu caja")}</h2>
                    <p>
                      {tr("Crea Efectivo y Banco para registrar los próximos pagos y cobros.")}</p>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        void mutate("setup", {}, "Caja preparada").catch(
                          () => {},
                        )
                      }
                    >
                      {tr("Crear caja de ventas")}</button>
                  </section>
                ))}
                {summary && (
                  <>
                    <details className="mg-cash-detail">
                    <summary>{tr("Ver detalle de ventas y pagos")}</summary>
                    <div className="mg-metrics">
                      {[
                        ["Cobrado", summary.collected],
                        ["Pagado", summary.paid],
                        ["Por cobrar", summary.remaining],
                        ["Por pagar", summary.payable],
                        ["Margen previsto", summary.profit],
                        ["Stock a coste", summary.stock],
                        ["Ventas acordadas", summary.agreed],
                        ["Flujo de caja", summary.cashFlow],
                        ["Reembolsos pendientes", summary.refundDue],
                        ["Reembolsos recibidos", summary.returned],
                      ].map(([label, amount]) => (
                        <article key={label}>
                          <span>{tv(label)}</span>
                          <strong>{money(Number(amount))}</strong>
                        </article>
                      ))}
                    </div>
                    <details className="mg-rules">
                      <summary>{tr("Cómo se calculan los importes")}</summary>
                      <p>
                        {tr("El saldo de cada cuenta incluye sus cobros, pagos y traspasos reales. Los bonos no participan.")}</p>
                      <p>
                        {tr("Margen previsto: ventas acordadas, menos su coste, gastos y devoluciones; se descuentan los reembolsos del proveedor recibidos. Un artículo en stock conserva su coste. No significa dinero cobrado. Los pedidos cancelados no suman ventas ni margen; sus movimientos reales se conservan.")}</p>
                      <p>
                        {tr("Flujo de caja: cobros y reembolsos recibidos menos compras, gastos y devoluciones pagadas. Los traspasos no cuentan como ingresos ni beneficio.")}</p>
                      <p>
                        {tr("El histórico importado no crea movimientos: revisa y vincula sus pagos para completar los cobros y pendientes.")}</p>
                    </details>
                    </details>
                  </>
                )}
                <section className="mg-history">
                  <h2>{tr("Movimientos de la caja")}</h2>
                  {data.movements
                    .filter((m) =>
                      businessAccounts.some(
                        (a) =>
                          a.id === m.account_id ||
                          a.id === m.destination_account_id,
                      ),
                    )
                    .map((m) => (
                      <div key={m.id}>
                        <span className="mg-icon">
                          {tv(m.type === "ingreso" ? (
                            <ArrowDownLeft />
                          ) : m.type === "traspaso" ? (
                            <ArrowLeftRight />
                          ) : (
                            <ArrowUpRight />
                          ))}
                        </span>
                        <span>
                          <strong>{tv(m.title)}</strong>
                          <small>
                            {dateLabel(m.date)} ·{" "}
                            {
                              tv(data.accounts.find((a) => a.id === m.account_id)
                                ?.name)
                            }
                          </small>
                        </span>
                        <strong>
                          {tv(m.type === "gasto"
                            ? "−"
                            : m.type === "ingreso"
                              ? "+"
                              : "")}
                          {money(Number(m.amount))}
                        </strong><span className="mg-cash-tools"><button type="button" className="mg-cash-edit" aria-label={tr("Editar {0}",{0:m.title})} title={tr("Editar movimiento")} disabled={busy} onClick={()=>{setError('');setEditor({type:'cash',movement:m});}}><Pencil size={17}/></button><button type="button" className="mg-cash-delete" aria-label={tr("Eliminar {0}",{0:m.title})} title={tr("Eliminar movimiento")} disabled={busy} onClick={()=>{setError('');setUndoAction({title:'¿Eliminar movimiento de Caja?',message:tr('Se eliminará «{0}» ({1}) y se recalculará el saldo. Si pertenece a un pedido, su pago o cobro también quedará anulado.',{0:m.title,1:money(Number(m.amount))}),run:async()=>{await mutate('cash_delete',{id:m.id,previous:m},'Movimiento eliminado');}});}}><Trash2 size={17}/></button></span>
                      </div>
                    ))}
                </section>
              </>
            ) : (
              <>
                <section className="mg-toolbar">
                  <label className="mg-search">
                    <Search size={20} />
                    <input
                      aria-label={tr("Buscar gestiones")}
                      type="search"
                      placeholder={
                        tab === "bonos"
                          ? tr("Buscar persona o plataforma")
                          : tr("Modelo, persona, talla, correo…")
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="mg-toolbar-actions">
                    <button className="secondary" aria-expanded={filtersOpen} aria-controls="mg-filters-panel" onClick={()=>setFiltersOpen(!filtersOpen)}>{tr("Filtros")}{tv(person || month || archived || view !== 'todos' ? tr(" · activos") : '')}</button>
                    <button className="secondary" aria-expanded={optionsOpen} aria-controls="mg-options-panel" onClick={()=>setOptionsOpen(!optionsOpen)}>{tr("Opciones")}</button>
                  </div>
                  <input
                    ref={fileRef}
                    className="mg-file"
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void importFile(f);
                      e.target.value = "";
                    }}
                  />
                </section>
                <div id="mg-filters-panel" hidden={!filtersOpen}>
                {tab !== "bonos" && (
                  <div className="mg-quick-filters" aria-label={tr("Vistas rápidas")}>
                    {[
                      ["todos", "Todos"],
                      ["reembolsos", "Reembolsos"],
                      ["intercambios", "Intercambios"],
                      ["por-pedir", "Por pedir"],
                      ["por-revisar", "Por revisar"],
                      ["en-camino", "En camino"],
                      ["en-casa", "En casa"],
                      ["por-entregar", tab==='ventas'?"Por enviar":"Por entregar"],
                      ["por-cobrar", "Por cobrar"],
                      ["incidencias", "Incidencias"],
                      ["tareas", "Tareas"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        aria-pressed={view === id}
                        onClick={() => setView(id)}
                      >
                        {tv(label)}
                      </button>
                    ))}
                  </div>
                )}
                <details className="mg-filter-options">
                  <summary>
                    {tr("Filtros")}{tv(person || month || archived ? tr(" · activos") : "")}
                  </summary>
                  <div>
                    <label>
                      {tr("Persona")}<select
                        value={person}
                        onChange={(e) => setPerson(e.target.value)}
                      >
                        <option value="">{tr("Todas")}</option>
                        {Array.from(
                          new Set(
                            data.items
                              .filter((i) => i.data.activity === tab)
                              .map((i) => i.data.person)
                              .filter(Boolean),
                          ),
                        )
                          .sort()
                          .map((name) => (
                            <option key={name}>{tv(name)}</option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {tr("Mes de compra / venta")}<input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                      />
                    </label>
                    <label className="mg-check">
                      <input
                        type="checkbox"
                        checked={archived}
                        onChange={(e) => setArchived(e.target.checked)}
                      />
                      {tr("Ver archivados")}</label>
                    <button
                      className="secondary"
                      onClick={() => {
                        setPerson("");
                        setMonth("");
                        setArchived(false);
                        setView("todos");
                        setQuery("");
                      }}
                    >
                      {tr("Limpiar")}</button>
                  </div>
                </details>
                </div>
                {tab === "bonos" && (
                  <p className="mg-information">
                    {tr("Registro de aportaciones y recuperaciones. Sin conexión con cuentas ni saldos.")}</p>
                )}
                {tab === "amigos" && person && (
                  <div className="mg-person-summary">
                    <Users />
                    <div>
                      <strong>{tv(person)}</strong>
                      <span>
                        {filtered.length} {tr("artículos ·")}{" "}
                        {money(
                          totalAmounts(
                            filtered.map(
                              (i) => itemTotals(i, activeEvents).remaining,
                            ),
                          ),
                        )}{" "}
                        {tr("por cobrar")}</span>
                    </div>
                  </div>
                )}
                <section id="mg-options-panel" className="mg-options-panel" hidden={!optionsOpen} aria-label={tr("Opciones de pedidos")}>
                  <button className="secondary" disabled={busy} onClick={()=>fileRef.current?.click()}><FileSpreadsheet size={18}/>{tr("Importar Excel")}</button>
                {filtered.length>0&&<details className="mg-activity-summary"><summary>{tr("Resumen de")} {tv(tab==='amigos'?tr("pedidos de amigos"):tab)} · {filtered.length} {tr("fichas")}</summary><div className="mg-metrics">{tv(tab==='bonos'?(()=>{const totals=filtered.map(i=>itemTotals(i,activeEvents));return [['Aportado',totalAmounts(totals.map(t=>t.contribution))],['Recuperado',totalAmounts(totals.map(t=>t.recovered))],['Resultado',totalAmounts(totals.map(t=>t.recovered-t.contribution))]];})().map(([label,amount])=><article key={label}><span>{tv(label)}</span><strong>{money(Number(amount))}</strong></article>):(()=>{const totals=managementSummary(filtered,activeEvents);return [['Cobrado',totals.collected],['Pagado',totals.paid],['Por cobrar',totals.remaining],['Resultado de ventas',totals.profit],['Stock a coste',totals.stock],['Flujo de caja',totals.cashFlow]];})().map(([label,amount])=><article key={label}><span>{tv(label)}</span><strong>{money(Number(amount))}</strong></article>))}</div></details>}
                <label className="mg-email-choice"><input type="checkbox" checked={showEmail} onChange={e=>setShowEmail(e.target.checked)}/>{tr("Mostrar correo como título del pedido")}</label>
                <div className="mg-view-tools">
                  <label>{tr("Agrupar por")} <select value={groupBy} onChange={e=>setGroupBy(e.target.value)}><option value="none">{tr("Más recientes primero")}</option><option value="person">{tr("Cliente o amigo")}</option><option value="status">{tr("Estado del pedido")}</option><option value="origin">{tr("Hoja de origen")}</option></select></label>
                  <button type="button" onClick={()=>setCardLayout(!cardLayout)}>{tv(cardLayout ? tr("Ver como lista") : tr("Ver como tarjetas"))}</button>
                </div>
                </section>
                <div className="mg-list-heading">
                  <h2>
                    {tv(tab === "ventas"
                      ? tr("Artículos")
                      : tab === "amigos"
                        ? tr("Pedidos de amigos")
                        : tr("Operaciones de bonos"))}
                  </h2>
                  <span>{filtered.length}</span>
                </div>
                {tv(filtered.length ? (
                  <div className={`mg-grid ${cardLayout ? '' : 'mg-compact-list'}`}>
                    {grouped.map(({item, heading, count}) => {
                      const d = item.data,
                        t = itemTotals(item, activeEvents),
                        isBonus = d.activity === "bonos",
                        visual = orderVisualState(item,activeEvents),
                        due =
                          !!d.next_action &&
                          (!d.review_date || d.review_date <= today());
                      return (
                        <Fragment key={item.id}>
                        {heading && <h3 className="mg-group-heading">{tv(heading)}<span>{tv(count)}</span></h3>}
                        <article className="mg-card" data-order-state={isBonus?undefined:visual.key}>{!isBonus&&<button className="mg-card-delete" type="button" title={tr("Eliminar pedido")} aria-label={tr("Eliminar pedido {0}",{0:d.model})} disabled={busy} onClick={()=>{setError('');setUndoAction({title:'¿Eliminar este pedido?',message:tr('Se eliminará «{0}» y se anularán sus pagos y cobros creados desde el pedido. Los movimientos externos vinculados se conservarán.',{0:d.model}),run:async()=>{await mutate('delete_order',{id:item.id,version:item.version},'Pedido y movimientos asociados eliminados');if(selected===item.id)setSelected(null);}});}}><Trash2 size={18}/></button>}
                          <button
                            className="mg-card-open"
                            onClick={() => {setConfirmDelete(false);setSelected(item.id);}}
                            aria-label={tr("Abrir {0}: {1}{2}",{0:d.email || d.person || d.model,1:d.model,2:d.size ? tr(', talla {0}',{0:d.size}) : ''})}
                          >
                            <span className="mg-item-icon">
                              {tv(isBonus ? (
                                <WalletCards />
                              ) : d.activity === "amigos" ? (
                                <Users />
                              ) : (
                                <Package />
                              ))}
                            </span>
                            <span className="mg-item-title">
                              <strong className={isBonus?'':'mg-order-title'}>{tv(isBonus?d.model:d.email||d.model)}</strong>{!isBonus&&d.email&&<span className="mg-order-model">{tv(d.model)}</span>}
                              {!isBonus && (d.activity==='amigos'||d.person||d.package_name) && <span className="mg-order-person">{tv(d.person || (d.activity==='amigos'?tr("Sin amigo asignado"):''))}{d.package_name && <>{(d.person||d.activity==='amigos')&&<> <span aria-hidden="true">·</span> </>}<span className="mg-package-recipient">{tr("Paquete:")} {tv(d.package_name)}</span></>}</span>}
                              <span>
                                {tv([d.sale==='Para mí'?tr('Para mí'):d.activity==='amigos'?tr('Para un amigo'):tr('Para Vinted'), d.color, d.size ? tr('Talla {0}',{0:d.size}) : '']
                                  .filter(Boolean)
                                  .join(" · ") || tr("Sin detalles adicionales"))}
                              </span>
                            </span>
                            <ChevronRight size={18} />
                          </button>
                          <div className="mg-card-body">
                            {!isBonus&&<div className="mg-state-block"><OrderStatus overviewState={visual.key} data={d} payment={orderPaymentState(item,activeEvents)}/>{t.unresolved.length>0&&<span className="mg-status-chip mg-status-warning"><CircleAlert size={15}/>{t.unresolved.length} {tr("incidencia")}{tv(t.unresolved.length>1?'s':'')}</span>}</div>}
                            <div className={`mg-card-amounts ${isBonus?'':'mg-order-amounts'}`}>
                              {tv(isBonus ? (
                                <>
                                  <span>
                                    {tr("Aportado")}<strong>{money(t.contribution)}</strong>
                                  </span>
                                  <span>
                                    {tr("Recuperado")}<strong>{money(t.recovered)}</strong>
                                  </span>
                                  <span>
                                    {tr("Resultado")}<strong>
                                      {money(
                                        totalAmounts([
                                          t.recovered,
                                          -t.contribution,
                                        ]),
                                      )}
                                    </strong>
                                  </span>
                                </>
                              ) : (
                                <><span className="mg-main-cost">{tr("Coste total")}<strong>{managementAmountLabel(item,orderTotalCost(d))}</strong></span>{d.sale!=='Para mí'&&<><span className="mg-sale-value">{tr("Precio de venta")}<strong>{managementAmountLabel(item,d.price)}</strong></span><span className="mg-profit-value">{tr("Beneficio previsto")}<strong className={t.expectedProfit<0?'mg-profit-loss':'mg-accent'}>{tv(d.tracking==='Cancelado'?'—':d.price>0?managementAmountLabel(item,t.expectedProfit):tr("Sin precio"))}</strong></span></>}</>
                              ))}
                            </div>
                            {!isBonus&&!item.archived&&<div className="mg-order-shortcuts">{renderStageControl(item)}</div>}
                            {d.next_action && (
                              <div
                                className={`mg-next-action ${due ? "mg-action-due" : ""}`}
                              >
                                <Clock3 size={16} />
                                <span>
                                  {tv(d.next_action)}
                                  <small>
                                    {tv(d.review_date
                                      ? dateLabel(d.review_date)
                                      : tr("Sin fecha"))}
                                  </small>
                                </span>
                              </div>
                            )}


                            {!!d.warnings?.length && d.tracking!=='Por revisar' && (
                              <span className="mg-review">
                                <CircleAlert size={14} />
                                {tr("Histórico por revisar")}</span>
                            )}
                          </div>
                          {tv(item.archived?<footer><button disabled={busy} onClick={()=>void mutate('archive',{id:item.id,archived:false},'Pedido restaurado').catch(()=>{})}><Archive size={16}/>{tr("Restaurar")}</button></footer>:isBonus?<footer><button disabled={busy} onClick={()=>openEvent(item,'recuperacion')}><Plus size={16}/>{tr("Registrar")}</button></footer>:null)}
                        </article>
                        </Fragment>
                      );
                    })}
                  </div>
                ) : (
                  <section className="mg-empty">
                    <Package size={36} />
                    <h2>
                      {tv(query || view !== "todos" || person || month
                        ? tr("Sin coincidencias")
                        : tab==='bonos'?tr("Sin operaciones"):tr("Sin pedidos"))}
                    </h2>
                    <p>
                      {tv(query || view !== "todos"
                        ? tr("Prueba otra búsqueda o cambia los filtros.")
                        : tab==='bonos'?tr("Añade una operación para empezar."):tr("Añade tu primer pedido para empezar."))}
                    </p>
                    <button
                      className="primary"
                      onClick={() => setEditor({ type: "item" })}
                    >
                      <Plus size={18} />
                      {tr("Añadir")} {tv(tab === "bonos" ? "bono" : "pedido")}
                    </button>
                  </section>
                ))}
              </>
            ))}
          </>
        ))}
      </main>
      <div className="day-mobile-nav">
        <AreaNav active="gestiones" />
      </div>
      {current && data && !editor && !voiding && !undoAction && (
        <ManagementSheet
          title={tv(current.data.activity==='bonos' ? current.data.model : current.data.email || tr("Sin correo de compra"))}
          onClose={() => setSelected(null)}
        >
          <div className="mg-detail">
            <div className="mg-detail-heading">
              <span className="mg-item-icon">
                <Package />
              </span>
              <div>
                <strong>{tv(current.data.model)}{current.data.package_name && <> <span aria-hidden="true">|</span> {tv(current.data.package_name)}</>}</strong>
                <span>{tv(current.data.sale==='Para mí'?tr("Para mí"):current.data.activity==='amigos'?'Para '+(current.data.person||'un amigo'):tr("Para Vinted"))}{tv(current.data.person&&current.data.activity!=='amigos'&&current.data.sale!=='Para mí'?' · '+current.data.person:'')}</span>
                <span>
                  {[current.data.color, current.data.size]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <small>#{current.id.slice(0, 8)}</small>
              </div>
              <button
                className="secondary"
                onClick={() => setEditor({ type: "item", item: current })}
              >
                <Pencil size={17} />
                {tr("Editar")}</button>
            </div>
            {current.data.photo && (
              <a
                className="mg-photo"
                href={current.data.photo}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tr("Ver foto del artículo")}<ChevronRight size={16} />
              </a>
            )}
            {current.data.activity!=='bonos'&&<><OrderStatus data={current.data} payment={orderPaymentState(current,activeEvents)}/>{tv(current.data.sale==='Para mí'?<p className="mg-personal-summary">{tr("Para ti · sin venta ni cobros pendientes. Coste total:")} <strong>{money(orderTotalCost(current.data))}</strong></p>:<div className="mg-payment-summary"><span>{tr("Precio acordado")}<strong>{managementAmountLabel(current,current.data.price)}</strong></span><span>{tr("Cobrado")}<strong>{money(itemTotals(current,activeEvents).collected)}</strong></span><span>{tr("Pendiente")}<strong>{managementAmountLabel(current,itemTotals(current,activeEvents).remaining)}</strong></span></div>)}{renderStageControl(current)}</>}
            {current.data.activity !== "bonos" && (
              <details className="mg-detail-more"><summary>{tv(current.data.sale==='Para mí'||current.data.activity==='amigos'?tr("Seguimiento del pedido"):tr("Seguimiento y venta"))}</summary><div className="mg-detail-status">
                <label>
                  {tr("Seguimiento")}<select
                    value={current.data.tracking==='Entregado'?'En casa':current.data.tracking}
                    disabled={busy}
                    onChange={(e) =>
                      void quickState(current, e.target.value).catch(() => {})
                    }
                  >
                    {[
                      "Por revisar",
                      "Por pedir",
                      "Pedido",
                      "En camino",
                      "En casa",
                      "Enviado",
                      "Cancelado",
                    ].map((s) => (
                      <option key={s}>{tv(s)}</option>
                    ))}
                  </select>
                </label>
                {current.data.activity!=='amigos'&&<label>
                  {tr("Venta")}<select
                    value={current.data.sale}
                    disabled={busy}
                    onChange={(e) =>
                      void mutate("save", {
                        id: current.id,
                        version: current.version,
                        previous: current.data,
                        data: {
                          ...current.data,
                          sale: e.target.value,
                          sale_date:
                            e.target.value === "Vendido"
                              ? current.data.sale_date || today()
                              : current.data.sale_date,
                        },
                      }).catch(() => {})
                    }
                  >
                    {["Por revisar","Para mí","Disponible", "Reservado", "Vendido"].map((s) => (
                      <option key={s} disabled={isVintedOrder(current.data)&&orderShipped(current.data)&&s!=='Vendido'}>{tv(s)}</option>
                    ))}
                  </select>
                </label>}
              </div></details>
            )}
            <details className="mg-detail-more"><summary>{tr("Importes y pagos")}</summary><div className="mg-metrics mg-detail-metrics">
              {tv(current.data.activity === "bonos"
                ? (() => {
                    const t = itemTotals(current, activeEvents);
                    return [
                      ["Aportado", t.contribution],
                      ["Recuperado", t.recovered],
                      [
                        "Resultado",
                        totalAmounts([t.recovered, -t.contribution]),
                      ],
                    ].filter(([label])=>current.data.sale!=='Para mí'||!['Venta acordada','Por cobrar','Resultado de venta'].includes(String(label)));
                  })().map(([label, amount]) => (
                    <article key={label}>
                      <span>{tv(label)}</span>
                      <strong>{managementAmountLabel(current, Number(amount))}</strong>
                    </article>
                  ))
                : (() => {
                    const t = itemTotals(current, activeEvents);
                    return [
                      ["Coste del artículo",current.data.cost],
                      ["Teléfono (fuera de Caja)",current.data.phone_cost??0],
                      ["Otros gastos",current.data.expenses],
                      ["Coste total",orderTotalCost(current.data)],
                      ["Venta acordada", current.data.price],
                      ["Cobrado", t.collected],
                      ["Por cobrar", t.remaining],
                      ["Compras y gastos pagados", t.paid],
                      ["Resultado de venta", t.profit],
                    ].filter(([label])=>current.data.sale!=='Para mí'||!['Venta acordada','Por cobrar','Resultado de venta'].includes(String(label)));
                  })().map(([label, amount]) => (
                    <article key={label}>
                      <span>{tv(label)}</span>
                      <strong>{managementAmountLabel(current, Number(amount))}</strong>
                    </article>
                  )))}
            </div>
            </details>
            <div className="mg-detail-actions">
              {tv(current.data.sale==='Para mí'?<button className="secondary" disabled={busy||current.archived} onClick={()=>setEditor({type:'item',item:{...current,data:{...current.data,sale:'Disponible',shipping_status:'pending',shipping_date:''}}})}><Pencil size={17}/>{tr("Poner en Vinted")}</button>:<button
                className="primary"
                disabled={busy||current.archived||(current.data.activity!=='bonos'&&collectionDisabled(current))}
                onClick={()=>current.data.activity==='bonos'?openEvent(current,'recuperacion'):collectOrSell(current)}
              >
                <Plus size={18} />
                {tv(current.data.activity === "bonos"
                  ? tr("Registrar importe")
                  : collectionLabel(current))}
              </button>)}
              <button
                className="secondary"
                disabled={busy||current.archived||(current.data.activity!=='bonos'&&(current.data.tracking==='Cancelado'||itemTotals(current,activeEvents).payable<=0))}
                onClick={() =>
                  openEvent(
                    current,
                    current.data.activity === "bonos" ? "aportacion" : "compra",
                  )
                }
              >
                <ArrowUpRight size={18} />
                {tv(current.data.activity === "bonos"
                  ? tr("Aportación")
                  : itemTotals(current,activeEvents).payable<=0?tr("Compra pagada"):tr("Pagar compra"))}
              </button>
            </div>
            <details className="mg-detail-more">
              <summary>{tr("Reembolso, intercambio y notas")}</summary>

              <div className="mg-detail-actions">
              <button
                className="secondary"
                disabled={current.archived}
                onClick={() => openEvent(current, "nota")}
              >
                <StickyNote size={18} />
                {tr("Nota")}</button>
              {current.data.activity !== "bonos" && (
                <button
                  className="secondary"
                  disabled={current.archived}
                  onClick={() => openEvent(current, "incidencia")}
                >
                  <CircleAlert size={18} />
                  {tr("Incidencia")}</button>
              )}
              </div>
            </details>
            {error && (
              <p role="alert" className="mg-error">
                {tv(error)}
              </p>
            )}
            {current.data.next_action && (
              <div className="mg-next-action">
                <Clock3 size={18} />
                <span>
                  {tv(current.data.next_action)}
                  <small>{dateLabel(current.data.review_date)}</small>
                </span>
              </div>
            )}
            {itemTotals(current, activeEvents).unresolved.map((incident) => (
              <section className="mg-incident" key={incident.id}>
                <strong>{String(incident.details.type || "Incidencia")}</strong>
                <p>{tv(incident.note || tr("Sin nota"))}</p>
                {Number(incident.amount) > 0 && (
                  <span>
                    {tr("Importe esperado:")} {money(Number(incident.amount))}
                  </span>
                )}
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      "event",
                      {
                        item_id: current.id,
                        kind: "estado",
                        amount: 0,
                        date: today(),
                        note: tr("Incidencia resuelta"),
                        request_id: crypto.randomUUID(),
                        details: { incident_id: incident.id },
                      },
                      "Incidencia cerrada",
                    ).catch(() => {})
                  }
                >
                  {tr("Marcar resuelta")}</button>
              </section>
            ))}
            <details>
              <summary>{tr("Datos del pedido")}</summary>
              <dl>
                {[
                  ["Referencia", current.data.order_ref],
                  ["Correo", current.data.email],
                  ["Teléfono", current.data.phone_number||''],
                  ["Nombre en el paquete", current.data.package_name||''],
                  ["Compra", current.data.purchase_date],
                  ["Llegada", current.data.arrival_date],
                  ["Venta", current.data.sale_date],
                  ["Entrega", current.data.delivery_date],
                ]
                  .filter(([, v]) => !!v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{tv(k)}</dt>
                      <dd>{tv(v)}</dd>
                    </div>
                  ))}
              </dl>
              {current.data.order_ref &&
                data.items
                  .filter(
                    (i) =>
                      i.id !== current.id &&
                      i.data.order_ref === current.data.order_ref,
                  )
                  .map((i) => (
                    <button
                      className="mg-related"
                      key={i.id}
                      onClick={() => setSelected(i.id)}
                    >
                      {tv(i.data.model)} · {tv(i.data.size)}
                      <ChevronRight size={16} />
                    </button>
                  ))}
            </details>
            {current.data.warnings?.length && (
              <details className="mg-original">
                <summary>{tr("Datos originales por revisar")}</summary>
                <p>
                  {tv(current.data.source_sheet)} {tr("· Fila")} {tv(current.data.source_row)}
                </p>
                {current.data.warnings.map((w) => (
                  <p key={w}>{tv(w)}</p>
                ))}
                <dl>
                  {Object.entries(current.data.original || {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <dt>{tr("Columna")} {tv(key)}</dt>
                        <dd>
                          {tv(typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value))}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      "save",
                      {
                        id: current.id,
                        version: current.version,
                        previous: current.data,
                        data: { ...current.data, warnings: [] },
                      },
                      "Revisión guardada",
                    ).catch(() => {})
                  }
                >
                  {tr("Marcar como revisado")}</button>
              </details>
            )}
            <details className="mg-timeline mg-detail-more">
              <summary>{tr("Historial")}</summary>
              {tv(historyError?.key===historyKey?<p role="alert">{tv(historyError.message)} <button className="text-button" onClick={()=>setHistoryRetry(n=>n+1)}>{tr("Reintentar")}</button></p>:history?.key!==historyKey?<p role="status">{tr("Cargando historial…")}</p>:null)}
              {historyEvents
                .filter((e) => e.item_id === current.id)
                .map((event) => (
                  <div
                    key={event.id}
                    className={event.voided ? "mg-voided" : ""}
                  >
                    <span className="mg-timeline-dot" />
                    <div>
                      <strong>
                        {tv(eventNames[event.kind] || event.kind)}
                        {tv(event.voided ? tr(" · Anulado") : "")}
                      </strong>
                      <small>
                        {dateLabel(event.date)}
                        {tv(event.account_id
                          ? " · " +
                            data.accounts.find((a) => a.id === event.account_id)
                              ?.name
                          : "")}
                      </small>
                      {event.note && <p>{tv(event.note)}</p>}
                      {event.kind === "estado" && Boolean(event.details.previous) && (
                        <details>
                          <summary>{tr("Ver cambios")}</summary>
                          <pre>
                            {JSON.stringify(event.details.previous, null, 2)}
                          </pre>
                        </details>
                      )}
                      {event.transaction_id && (
                        <Link href={`/dinero?movement=${event.transaction_id}`}>
                          {tr("Ver en Dinero")}<ChevronRight size={14} />
                        </Link>
                      )}
                      {event.debt_payment_id && (
                        <Link href="/dinero">
                          {tr("Ver cobro en Dinero")}<ChevronRight size={14} />
                        </Link>
                      )}
                    </div>
                    <span>
                      {tv(Number(event.amount) > 0
                        ? money(Number(event.amount))
                        : "")}
                      {!event.voided &&
                        [
                          "compra",
                          "gasto",
                          "cobro",
                          "reembolso_proveedor",
                          "devolucion_cliente",
                          "aportacion",
                          "recuperacion",
                        ].includes(event.kind) && (
                          <button
                            className="mg-undo"
                            disabled={busy}
                            onClick={() => {
                              setVoiding(event);
                              setVoidKey(crypto.randomUUID());
                            }}
                          >
                            {tr("Anular")}</button>
                        )}
                    </span>
                  </div>
                ))}
            </details>
            <details className="mg-detail-more">
              <summary>{tr("Archivo y eliminación")}</summary>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void mutate(
                  "archive",
                  { id: current.id, archived: !current.archived },
                  current.archived ? "Ficha restaurada" : "Ficha archivada",
                )
                  .then(() => setSelected(null))
                  .catch(() => {})
              }
            >
              <Archive size={18} />
              {tv(current.archived ? tr("Restaurar ficha") : tr("Archivar ficha"))}
            </button>
            {tv(!confirmDelete ? <button className="mg-delete-order" disabled={busy} onClick={()=>setConfirmDelete(true)}><Trash2 size={18}/>{tr("Eliminar pedido")}</button> : <section className="mg-delete-confirm" aria-label={tr("Confirmar eliminación")}>
              <strong>{tr("¿Eliminar este pedido?")}</strong>
              <p>{tr("Se eliminarán el pedido y sus pagos y cobros creados desde Gestiones. Los movimientos externos que hubieras vinculado se conservarán.")}</p>
              <div><button className="secondary" disabled={busy} onClick={()=>setConfirmDelete(false)}>{tr("Cancelar")}</button><button className="mg-delete-order" disabled={busy} onClick={()=>void mutate('delete_order',{id:current.id,version:current.version},'Pedido y movimientos asociados eliminados').then(()=>{setSelected(null);setConfirmDelete(false);}).catch(()=>{})}><Trash2 size={18}/>{tr("Eliminar pedido")}</button></div>
            </section>)}
            </details>
          </div>
        </ManagementSheet>
      )}
      {editor && data && (
        <ManagementSheet
          title={
            tv(editor.type === "item"
              ? editor.item
                ? tr("Editar ficha")
                : tr("Nuevo pedido")
              : editor.type === "cash"?tr("Editar movimiento de Caja"):editor.type === "sale"?tr("Venta de Vinted"):editor.type === "transfer"
                ? editor.deposit?tr("Añadir dinero a Caja"):tr("Traspasar dinero")
                : tr("Añadir registro"))
          }
          onClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          {tv(editor.type === "cash" ? <form className="mg-cash-form" onSubmit={e=>{e.preventDefault();const values=new FormData(e.currentTarget);void mutate('cash_edit',{id:editor.movement.id,previous:editor.movement,title:String(values.get('title')||''),amount:Number(String(values.get('amount')||'').replace(',','.')),date:values.get('date'),account_id:values.get('account_id'),destination_account_id:values.get('destination_account_id')||null},'Movimiento actualizado').then(()=>setEditor(null)).catch(()=>{});}}><label>{tr("Concepto")}<input name="title" required maxLength={160} defaultValue={editor.movement.title}/></label><div><label>{tr("Importe (€)")}<input name="amount" required inputMode="decimal" defaultValue={Number(editor.movement.amount).toFixed(2)}/></label><label>{tr("Fecha")}<input type="date" name="date" required defaultValue={editor.movement.date.slice(0,10)}/></label></div><label>{tv(editor.movement.type==='traspaso'?tr("Cuenta de origen"):tr("Cuenta"))}<select name="account_id" required defaultValue={editor.movement.account_id}>{data.accounts.map(a=><option key={a.id} value={a.id}>{tv(a.name)}</option>)}</select></label>{editor.movement.type==='traspaso'&&<label>{tr("Cuenta de destino")}<select name="destination_account_id" required defaultValue={editor.movement.destination_account_id||''}>{data.accounts.map(a=><option key={a.id} value={a.id}>{tv(a.name)}</option>)}</select></label>}{error&&<p role="alert" className="mg-error">{tv(error)}</p>}<button className="primary" disabled={busy}>{tv(busy?tr("Guardando…"):tr("Guardar cambios"))}</button></form> : editor.type === "item" ? (
            <ItemForm
              item={editor.item}
              accounts={data.accounts}
              activity={
                ["ventas", "amigos", "bonos"].includes(tab)
                  ? (tab as ManagementData["activity"])
                  : "ventas"
              }
              busy={busy}
              onSave={async (rows,paymentAccountId) => {
                await mutate("save_many", {items:rows,payment_account_id:paymentAccountId});
                setEditor(null);
              }}
            />
          ) : editor.type === "sale" ? <VintedSaleForm item={editor.item} busy={busy} onSave={async next=>{await mutate('save',{id:editor.item.id,version:editor.item.version,previous:editor.item.data,data:{...next,tracking:'Enviado',shipping_status:'sent',shipping_date:next.shipping_date||today()}},'Vendido y enviado. Registra el cobro cuando recibas el dinero.');setEditor(null);}}/> : editor.type === "event" ? (
            <EventForm
              suggestedAmount={editor.type==='event'?itemTotals(data.items.find(i=>i.id===editor.item.id)||editor.item,activeEvents).remaining:undefined}
              item={editor.item}
              snapshot={{ ...data, events: activeEvents }}
              kind={editor.kind}
              busy={busy}
              onSave={async (p) => {
                await mutate("event", p, "Registro guardado");
                setEditor(null);
              }}
            />
          ) : (
            <TransferForm
              snapshot={data}
              deposit={editor.type==='transfer'&&editor.deposit}
              busy={busy}
              onSave={async (p) => {
                await mutate("transfer", p, editor.type==='transfer'&&editor.deposit?"Dinero añadido a Caja":"Traspaso guardado");
                setEditor(null);
              }}
            />
          ))}
        </ManagementSheet>
      )}
      {undoAction&&<ManagementSheet title={tv(undoAction.title)} onClose={()=>{if(!busy)setUndoAction(null);}}><div className="mg-detail"><p>{tv(undoAction.message)}</p>{error&&<p className="mg-error" role="alert">{tv(error)}</p>}<div className="mg-detail-actions"><button className="secondary" disabled={busy} onClick={()=>setUndoAction(null)}>{tv(undoAction.title.startsWith('¿Eliminar')?tr("Cancelar"):tr("Mantener estado"))}</button><button className="primary" disabled={busy} onClick={()=>void undoAction.run().then(()=>setUndoAction(null)).catch(()=>{})}>{tv(busy?tr("Guardando…"):undoAction.title.startsWith('¿Eliminar')?tr("Sí, eliminar"):tr("Sí, deshacer"))}</button></div></div></ManagementSheet>}
      {voiding && (
        <ManagementSheet
          title={tr("Anular registro")}
          onClose={() => {
            if (!busy) setVoiding(null);
          }}
        >
          <div className="mg-detail">
            <p>
              {tv(voiding.details.owned
                ? tr("Se anulará el movimiento creado desde Gestiones y se actualizarán la cuenta y la deuda vinculada.")
                : tr("Se quitará el vínculo con esta ficha. El movimiento original de Dinero se conserva."))}
            </p>
            <p>{tv(eventNames[voiding.kind]||voiding.kind)}: <strong>{money(Number(voiding.amount))}</strong>{tr(". Se anula este registro; los demás cobros del pedido se conservan.")}</p><p>{tr("El historial conservará la anulación.")}</p>
            {error && (
              <p className="mg-error" role="alert">
                {tv(error)}
              </p>
            )}
            <div className="mg-detail-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setVoiding(null)}
              >
                {tr("Cancelar")}</button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    "void",
                    { id: voiding.id, request_id: voidKey },
                    "Registro anulado",
                  )
                    .then(() => setVoiding(null))
                    .catch(() => {})
                }
              >
                {tr("Anular registro")}</button>
            </div>
          </div>
        </ManagementSheet>
      )}
      {preview && (
        <ManagementSheet
          title={tr("Revisar importación")}
          onClose={() => {
            if (!busy) setPreview(null);
          }}
        >
          <div className="mg-detail">
            <p>
              {tr("Se importan fichas de Ventas, Amigos y Bonos. ScanTap está excluido. No se crean movimientos ni se cambian saldos.")}</p>
            <p className="mg-hint">
              {tr("Marcas como “X”, “Banco” y “remb si” se conservan para revisión. Las fechas sin contexto no se asignan.")}</p>
            <div className="mg-preview-actions">
              <strong>
                {preview.filter((r) => r.selected).length} {tr("seleccionadas")}</strong>
              <button
                className="secondary"
                onClick={() =>
                  setPreview((rows) =>
                    rows!.map((r) => ({
                      ...r,
                      selected: !r.imported && !r.duplicate,
                    })),
                  )
                }
              >
                {tr("Solo sin posibles duplicados")}</button>
              <button
                className="secondary"
                onClick={() =>
                  setPreview((rows) =>
                    rows!.map((r) => ({ ...r, selected: !r.imported })),
                  )
                }
              >
                {tr("Seleccionar disponibles")}</button>
            </div>
            <div className="mg-preview-list">
              {preview.map((row, i) => (
                <label key={row.source_key}>
                  <input
                    type="checkbox"
                    disabled={row.imported || busy}
                    checked={row.selected}
                    onChange={(e) =>
                      setPreview((rows) =>
                        rows!.map((r, index) =>
                          index === i
                            ? { ...r, selected: e.target.checked }
                            : r,
                        ),
                      )
                    }
                  />
                  <span>
                    <strong>{tv(row.data.model)}</strong>
                    <span>
                      {tv(row.data.person)} · {tv(row.data.source_sheet)} {tr("· Fila")}{" "}
                      {tv(row.data.source_row)}
                    </span>
                    <small>
                      {tr("Coste")} {money(row.data.cost)} {tr("· Venta")}{" "}
                      {money(row.data.price)}
                    </small>
                    {tv(row.imported ? (
                      <small>{tr("Ya importada")}</small>
                    ) : row.duplicate ? (
                      <small className="mg-review">
                        {tr("Posible duplicado: revisa antes de importar")}</small>
                    ) : null)}
                    <small>
                      {tv(row.data.warnings?.[1] || tr("Pendiente de revisar"))}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <button
              className="primary"
              disabled={busy || !preview.some((r) => r.selected)}
              onClick={() =>
                void mutate(
                  "import",
                  {
                    items: preview
                      .filter((r) => r.selected)
                      .map(({ data, source_key }) => ({ data, source_key })),
                  },
                  "Histórico importado sin cambiar saldos",
                )
                  .then(() => setPreview(null))
                  .catch(() => {})
              }
            >
              {tv(busy ? tr("Importando…") : tr("Importar fichas seleccionadas"))}
            </button>
          </div>
        </ManagementSheet>
      )}
    </div>
  );
}
