"use client";
import { t, tv } from "@/lib/i18n";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Plus, Trash2, X } from "lucide-react";
import { parseAmount } from "@/lib/amount";
import {
  emptyManagement,
  money,
  saleStates,
  splitExpense,
  trackingStates,
  orderDelivered,
  orderShipped,
  ORDER_PHONE_COST,
  type ManagementData,
  type ManagementItem,
  type ManagementSnapshot,
} from "@/lib/management";

export function ManagementSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className="mg-sheet app-form-sheet"
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={id}>{tv(title)}</h2>
        <button type="button" aria-label={t("Cerrar")} onClick={onClose}>
          <X size={22} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function AmountField({
  label,
  name,
  value,
  required = false,
}: {
  label: string;
  name: string;
  value?: number;
  required?: boolean;
}) {
  return (
    <label>
      {tv(label)}
      <div className="mg-money-input">
        <input
          name={name}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          defaultValue={value || ""}
          required={required}
        />
        <span>€</span>
      </div>
    </label>
  );
}
function readMoney(form: FormData, name: string) {
  const value = String(form.get(name) || "0");
  const number = parseAmount(value);
  if (number < 0) throw new Error(t("El importe debe ser positivo."));
  return number;
}
const value = (form: FormData, key: string) =>
  String(form.get(key) || "").trim();
export function ItemForm({
  item,
  activity,
  busy,
  accounts,
  onSave,
}: {
  item?: ManagementItem;
  activity: ManagementData["activity"];
  busy: boolean;
  accounts: ManagementSnapshot['accounts'];
  onSave: (
    rows: {
      data: ManagementData;
      id?: string;
      version?: number;
      source_key: string;
      previous?: ManagementData;
    }[],
    paymentAccountId?: string,
  ) => Promise<void>;
}) {
  const d = item?.data || emptyManagement(activity);
  const [kind, setKind] = useState(d.activity),
    [error, setError] = useState("");
  const [sale,setSale]=useState(d.sale);
  const [tracking,setTracking]=useState(d.tracking==='Entregado'?'En casa':d.tracking);
  const [sent,setSent]=useState(orderShipped(d));
  const personal=kind==='ventas'&&sale==='Para mí';
  const [extras, setExtras] = useState<
    {
      key: string;
      model: string;
      color: string;
      size: string;
      cost: string;
      price: string;
    }[]
  >([]);
  const [quote,setQuote]=useState({cost:String(d.cost||''),expenses:String(d.expenses||''),account:''});
  function quotedAmount(raw:string){try{const amount=parseAmount(raw.trim()||'0');return amount>=0?amount:NaN;}catch{return NaN;}}
  const cashQuote=quotedAmount(quote.cost)+quotedAmount(quote.expenses)+extras.reduce((sum,row)=>sum+quotedAmount(row.cost),0);
  const quoteAccount=accounts.find(a=>a.id===quote.account);
  const saveKey = useRef(crypto.randomUUID());
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const form = new FormData(e.currentTarget),
        data = { ...d, activity: kind };
      for (const key of [
        "model",
        "color",
        "size",
        "person",
        "email",
        "phone_number",
        "package_name",
        "order_ref",
        "purchase_date",
        "arrival_date",
        "sale_date",
        "delivery_date",
        "tracking",
        "sale",
        "next_action",
        "review_date",
        "photo",
      ] as const)
        data[key] = value(form, key);
      data.cost = readMoney(form, "cost");
      data.price = personal?0:readMoney(form, "price");
      data.expenses = readMoney(form, "expenses");
      if(kind!=='bonos'){
        if(kind==='ventas'&&!personal){data.shipping_status=value(form,'shipping_status')==='sent'?'sent':'pending';data.shipping_date=data.shipping_status==='sent'?(data.shipping_date||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())):'';}else{data.delivery_status=value(form,'delivery_status')==='delivered'?'delivered':'pending';data.delivery_date=data.delivery_status==='delivered'?(data.delivery_date||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())):'';}
      }
      if(kind==='amigos')data.sale='Vendido';
      else if(kind==='ventas')data.sale=sale;
      const shared = splitExpense(data.expenses, extras.length + 1);
      const phoneShares=splitExpense(kind==='bonos'?0:(item?.data.phone_cost??ORDER_PHONE_COST),extras.length+1);
      if(kind!=='bonos')data.phone_cost=phoneShares[0];
      data.expenses = shared[0];
      if(extras.length&&!data.order_ref)data.order_ref=`Pedido ${saveKey.current.slice(0,8)}`;
      if (kind === "bonos") {
        data.tracking = d.tracking;
        data.sale = d.sale;
      }
      const rows = [
        {
          id: item?.id,
          version: item?.version,
          data,
          source_key: item?.source_key || `manual:${saveKey.current}:0`,
          previous: item?.data,
        },
        ...extras.map((row, i) => ({
          data: {
            ...data,
            model: row.model,
            color: row.color,
            size: row.size,
            cost: parseAmount(row.cost || "0"),
            price: personal?0:parseAmount(row.price || "0"),
            expenses: shared[i + 1],
            phone_cost: phoneShares[i + 1],
          },
          source_key: `manual:${saveKey.current}:${i + 1}`,
        })),
      ];
      const paymentAccountId=!item&&kind!=='bonos'?value(form,'payment_account_id'):undefined;
      if(!item&&kind!=='bonos'&&!accounts.some(a=>a.id===paymentAccountId&&a.scope==='business'))throw new Error(t("Elige la cuenta de Caja desde la que pagas el pedido."));
      await onSave(rows,paymentAccountId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form className="mg-form" onSubmit={submit} onChange={e=>{const form=new FormData(e.currentTarget);setQuote({cost:String(form.get('cost')||''),expenses:String(form.get('expenses')||''),account:String(form.get('payment_account_id')||'')});}}>
      <div className="mg-form-main">
        <fieldset className="form-block mg-identity-block"><legend>{tv(kind==='bonos'?t("Actividad y persona"):t("Datos del pedido"))}</legend><div className="mg-form-block-fields">
        {kind!=='bonos'&&<label>{t("Correo de compra")}<input name="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} defaultValue={d.email} placeholder={t("Correo usado para pedir")}/></label>}
        {kind!=='bonos'&&<fieldset className="order-purpose"><legend>{t("¿Para quién es?")}</legend><div>{[{id:'personal',label:t("Para mí")},{id:'vinted',label:t("Vinted")},{id:'amigos',label:t("Amigo")}].map(option=><button key={option.id} type="button" aria-pressed={(kind==='amigos'?'amigos':personal?'personal':'vinted')===option.id} disabled={!!item&&(option.id==='amigos'?d.activity!=='amigos':d.activity!=='ventas')} onClick={()=>{const purpose=option.id;setKind(purpose==='amigos'?'amigos':'ventas');if(purpose==='personal'){setSale('Para mí');setSent(false);if(tracking==='Enviado')setTracking('En casa');}else if(purpose==='vinted'&&sale==='Para mí')setSale('Disponible');}}>{tv(option.label)}</button>)}</div></fieldset>}
        <label>
          {tv(kind === "bonos" ? t("Plataforma / casino") : t("Modelo o artículo"))}
          <input
            name="model"
            required
            maxLength={160}
            defaultValue={d.model}
            placeholder={
              kind === "bonos" ? t("Ej. Plataforma") : t("Ej. Adidas Spezial")
            }
          />
        </label>
        {kind!=='bonos'&&<AmountField label={t("Coste del artículo")} name="cost" value={d.cost}/>}
        {kind !== "bonos" && <label>{t("Talla")}<input name="size" defaultValue={d.size} placeholder={t("40 / M")} /></label>}
        {kind !== "bonos" && <label>{t("Nombre en el paquete")}<input name="package_name" maxLength={100} autoComplete="off" defaultValue={d.package_name||''} placeholder={t("Nombre que figura en el envío")}/></label>}
        <details className={`order-person-options ${kind==='amigos'||kind==='bonos'?'order-person-required':''}`} open={kind==='amigos'||kind==='bonos'||!!d.person||undefined}><summary>{tv(personal?t("Para quién (opcional)"):t("Comprador de Vinted (opcional)"))}</summary>        <label>
          {tv(kind === "bonos" ? t("Persona") : personal?t("Para quién (opcional)"):kind==='amigos'?t("Nombre del amigo"):t("Comprador de Vinted (opcional)"))}
          <input
            name="person"
            maxLength={100}
            defaultValue={d.person}
            placeholder={kind === "ventas" ? t("Opcional") : t("Nombre")}
          />
        </label>
</details>
        </div></fieldset>
        <fieldset className="form-block mg-payment-block"><legend>{tv(kind==='bonos'?t("Importes previstos"):personal?t("Pago del pedido"):t("Venta y pago"))}</legend><div className="mg-form-block-fields">
        <div className="mg-form-grid">
          {kind==='bonos'&&<AmountField
            label={
              kind === "bonos" ? t("Aportación prevista") : t("Coste del artículo")
            }
            name="cost"
            value={d.cost}
          />}
          {!personal&&<AmountField
            label={
              tv(kind === "bonos" ? t("Recuperación prevista") : kind==='amigos'?t("Precio acordado"):sale==='Vendido'?t("Precio vendido"):t("Precio previsto (opcional)"))
            }
            name="price"
            value={d.price}/>}
        </div>
        {!item&&kind!=='bonos'&&<section className="mg-phone-section"><label>{t("Pagar desde Caja")}<select name="payment_account_id" required defaultValue=""><option value="" disabled>{t("Elige Banco o Efectivo")}</option>{accounts.filter(a=>a.scope==='business').map(a=><option key={a.id} value={a.id}>{tv(a.name)}</option>)}</select></label>{!accounts.some(a=>a.scope==='business')&&<p role="alert" className="mg-error">{t("Primero prepara tus cuentas en Caja.")}</p>}</section>}
        {personal&&item&&<p className="mg-hint">{t("Pedido personal. Los pagos se gestionan desde su ficha.")}</p>}

        </div></fieldset>
        {kind!=='bonos'&&<details className="mg-purchase-details"><summary>{t("Más detalles del pedido")}</summary><div className="mg-form-main"><label>{t("Color")}<input name="color" defaultValue={d.color} placeholder={t("Opcional")}/></label><label>{t("Teléfono usado")}<input name="phone_number" type="tel" inputMode="tel" autoComplete="off" maxLength={60} defaultValue={d.phone_number||''} placeholder={t("Opcional")}/></label></div></details>}

        {kind !== "bonos" && (
          <>
            <details><summary>{t("Seguimiento y entrega")}</summary><div className="mg-form-main mg-form-grid">
              <label>
                {t("Seguimiento")}<select name="tracking" value={tracking} onChange={e=>{const next=e.target.value;setTracking(next);if(kind==='ventas'&&!personal&&next!=='Cancelado'){setSent(next==='Enviado');if(next==='Enviado')setSale('Vendido');}}}>
                  {trackingStates.filter(s=>s!=='Entregado'&&(!!item||!['Cancelado','Por revisar'].includes(s))).map((s) => (
                    <option key={s}>{tv(s)}</option>
                  ))}
                </select>
              </label>
              {tv(kind!=='amigos'?<label>
                {t("Venta")}<select name="sale" value={sale} onChange={e=>setSale(e.target.value)}>
                  {saleStates.map((s) => (
                    <option key={s} disabled={kind==='ventas'&&!personal&&sent&&s!=='Vendido'}>{tv(s)}</option>
                  ))}
                </select>
              </label>:<input type="hidden" name="sale" value="Vendido"/>)}
              {tv(kind==='ventas'&&!personal?<label>{t("Envío al comprador")}<select name="shipping_status" value={sent?'sent':'pending'} onChange={e=>{const next=e.target.value==='sent';setSent(next);if(next){setTracking('Enviado');setSale('Vendido');}else if(tracking==='Enviado')setTracking('En casa');}}><option value="pending">{t("Por enviar")}</option><option value="sent">{t("Enviado")}</option></select></label>:<label>{tv(personal?t("Recepción del paquete"):t("Entrega al amigo"))}<select name="delivery_status" defaultValue={orderDelivered(d)?'delivered':'pending'}><option value="pending">{tv(personal?t("No recibido"):t("No entregado"))}</option><option value="delivered">{tv(personal?t("Recibido"):t("Entregado"))}</option></select></label>)}
            </div></details>
            {!item &&
              extras.map((row, index) => (
                <fieldset key={row.key} className="mg-extra">
                  <legend>{t("Artículo")} {index + 2}</legend>
                  <button
                    type="button"
                    aria-label={t("Quitar artículo {0}",{0:index + 2})}
                    onClick={() =>
                      setExtras((current) =>
                        current.filter((r) => r.key !== row.key),
                      )
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                  {(["model", "color", "size", "cost", "price"] as const).filter(key=>!personal||key!=="price").map(
                    (key) => (
                      <label key={key}>
                        {
                          tv({
                            model: "Modelo",
                            color: "Color",
                            size: "Talla",
                            cost: "Coste",
                            price: "Precio de venta",
                          }[key])
                        }
                        <input
                          required={key === "model"}
                          inputMode={
                            ["cost", "price"].includes(key)
                              ? "decimal"
                              : undefined
                          }
                          value={row[key]}
                          onChange={(e) =>
                            setExtras((current) =>
                              current.map((r) =>
                                r.key === row.key
                                  ? { ...r, [key]: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </label>
                    ),
                  )}
                </fieldset>
              ))}
            {!item && (
              <button
                className="secondary"
                type="button"
                onClick={() =>
                  setExtras((current) => [
                    ...current,
                    {
                      key: crypto.randomUUID(),
                      model: "",
                      color: "",
                      size: "",
                      cost: "",
                      price: "",
                    },
                  ])
                }
              >
                <Plus size={18} />
                {t("Otro artículo del pedido")}</button>
            )}
            <details>
              <summary>{t("Pedido, fechas y gastos")}</summary>
              <div className="mg-form-main">
                <label>
                  {t("Referencia del pedido")}<input
                    name="order_ref"
                    defaultValue={d.order_ref}
                    placeholder={t("Referencia compartida por todos sus artículos")}
                  />
                </label>
                <AmountField
                  label={
                    extras.length
                      ? t("Gastos adicionales de todo el pedido")
                      : t("Gastos adicionales del artículo")
                  }
                  name="expenses"
                  value={d.expenses}
                />
                {extras.length > 0 && (
                  <p className="mg-hint">
                    {t("Se reparten entre los")} {extras.length + 1} {t("artículos, conservando el total al céntimo.")}</p>
                )}
                <div className="mg-form-grid">
                  {[
                    ["purchase_date", "Compra"],
                    ["arrival_date", "Llegada"],
                    ["sale_date", "Venta"],
                    ["delivery_date", "Entrega"],
                  ].map(([name, label]) => (
                    <label key={name}>
                      {tv(label)}
                      <input
                        type="date"
                        name={name}
                        defaultValue={d[name as keyof ManagementData] as string}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  {t("Enlace de foto (opcional)")}<input
                    type="url"
                    name="photo"
                    defaultValue={d.photo}
                    placeholder="https://…"
                  />
                </label>
              </div>
            </details>
          </>
        )}
        <details open={!!d.next_action}>
          <summary>{t("Próxima acción")}</summary>
          <div className="mg-form-main">
            <label>
              {t("Qué falta hacer")}<input
                name="next_action"
                defaultValue={d.next_action}
                placeholder={t("Ej. Entregar a Iván")}
              />
            </label>
            <label>
              {t("Fecha de revisión")}<input
                type="date"
                name="review_date"
                defaultValue={d.review_date}
              />
            </label>
          </div>
        </details>

        <details className="mg-payment-explanation"><summary>{t("Cómo se registra el dinero")}</summary><p className="mg-hint">{tv(kind==='bonos'?t("Los bonos no modifican ninguna cuenta."):item?t("Editar no vuelve a pagar el coste. Los pagos y cobros se gestionan desde la ficha."):t("Al guardar se paga el artículo y los gastos adicionales desde Caja. Una venta prevista no registra un cobro."))}</p>{kind!=='bonos'&&<p className="mg-hint">{t("Teléfono:")} {money(item?.data.phone_cost??ORDER_PHONE_COST)}{t(", pagado fuera de Caja y no reembolsable.")}</p>}</details>
        {error && (
          <p role="alert" className="mg-error">
            {tv(error)}
          </p>
        )}
      </div>
      <footer>
        {!item&&kind!=='bonos'&&<section className="mg-payment-quote" aria-live="polite"><span>{tv(quoteAccount?t('Se descontará de {0}',{0:quoteAccount.name}):t("Elige una cuenta de Caja"))}</span><strong>{tv(Number.isFinite(cashQuote)&&cashQuote>=0?money(cashQuote):t("Revisa los importes"))}</strong><small>{t("Teléfono:")} {money(ORDER_PHONE_COST)} {t("· pagado aparte")}{tv(extras.length?t(" por todo el pedido"):'')}</small></section>}
        <button className="primary" disabled={busy||(!item&&kind!=='bonos'&&(!Number.isFinite(cashQuote)||cashQuote<0))}>
          {tv(busy
            ? t("Guardando…")
            : item
              ? t("Guardar cambios")
              : kind==='bonos'?t("Crear operación"):t("Crear pedido y registrar pago"))}
        </button>
      </footer>
    </form>
  );
}

export function EventForm({
  item,
  snapshot,
  kind: initial,
  busy,
  onSave,
  suggestedAmount,
}: {
  item: ManagementItem;
  snapshot: ManagementSnapshot;
  kind: string;
  busy: boolean;
  suggestedAmount?: number;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [kind, setKind] = useState(initial),
    [mode, setMode] = useState("new"),
    [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const bonus = item.data.activity === "bonos";
  const kinds = bonus
    ? [
        ["aportacion", "Aportación"],
        ["recuperacion", "Recuperación"],
        ["nota", "Nota"],
      ]
    : [
        ["compra", "Pagar compra"],
        ["gasto", "Gasto adicional"],
        ["cobro", "Registrar cobro"],
        ["reembolso_proveedor", "Reembolso recibido"],
        ["devolucion_cliente", "Devolución pagada"],
        ["incidencia", "Abrir incidencia"],
        ["nota", "Añadir nota"],
      ];
  const financial = !["nota", "incidencia"].includes(kind);
  const incoming = ["cobro", "reembolso_proveedor"].includes(kind);
  const linked = new Set(
    snapshot.events.filter((e) => !e.voided).map((e) => e.transaction_id),
  );
  const candidates = snapshot.movements.filter(
    (m) => m.type === (incoming ? "ingreso" : "gasto") && !linked.has(m.id),
  );
  const linkedPayments = new Set(
    snapshot.events.filter((e) => !e.voided).map((e) => e.debt_payment_id),
  );
  const payments = snapshot.debtPayments.filter(
    (p) =>
      !linkedPayments.has(p.id) &&
      snapshot.debts.some(
        (d) => d.id === p.debt_id && d.direction === "me_deben",
      ),
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      await onSave({
        item_id: item.id,
        kind,
        amount: readMoney(form, "amount"),
        date: value(form, "date"),
        note: value(form, "note"),
        account_id:
          !bonus && financial && mode !== "existing" && mode !== "payment"
            ? value(form, "account_id")
            : null,
        transaction_id:
          mode === "existing" ? value(form, "transaction_id") : null,
        debt_id: mode === "debt" ? value(form, "debt_id") : null,
        debt_payment_id:
          mode === "payment" ? value(form, "debt_payment_id") : null,
        request_id: requestId.current,
        details:
          kind === "incidencia" ? { type: value(form, "incident_type") } : value(form,'incident_id')?{incident_id:value(form,'incident_id')}:{},
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form className="mg-form" onSubmit={submit}>
      <div className="mg-form-main">
        <div className="mg-context">
          <strong>{tv(item.data.model)}</strong>
          <span>{tv(item.data.person || item.data.order_ref)}</span>
        </div>
        <label>
          {t("Acción")}<select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setMode("new");
            }}
          >
            {kinds.map(([id, label]) => (
              <option value={id} key={id}>
                {tv(label)}
              </option>
            ))}
          </select>
        </label>
        {kind==='reembolso_proveedor'&&<label>{t("Incidencia relacionada (opcional)")}<select name="incident_id"><option value="">{t("Sin incidencia")}</option>{snapshot.events.filter(e=>e.item_id===item.id&&e.kind==='incidencia'&&!e.voided&&e.details.type==='Reembolso proveedor').map(e=><option key={e.id} value={e.id}>{tv(e.note||t("Reembolso proveedor"))} · {money(Number(e.amount))}</option>)}</select></label>}
        {financial && !bonus && (
          <label>
            {t("Cómo registrarlo")}<select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="new">{t("Crear movimiento nuevo")}</option>
              <option value="existing">{t("Vincular movimiento de Dinero")}</option>
              {kind === "cobro" && (
                <>
                  <option value="debt">{t("Cobrar una deuda existente")}</option>
                  <option value="payment">
                    {t("Vincular cobro de deuda ya registrado")}</option>
                </>
              )}
            </select>
          </label>
        )}
        {kind === "incidencia" && (
          <label>
            {t("Tipo de incidencia")}<select name="incident_type">
              <option>{t("Cambio")}</option>
              <option>{t("Devolución cliente")}</option>
              <option>{t("Reembolso proveedor")}</option>
              <option>{t("Otra incidencia")}</option>
            </select>
          </label>
        )}
        {tv(mode === "existing" && financial ? (
          <label>
            {t("Movimiento")}<select name="transaction_id" required>
              <option value="">{t("Selecciona un movimiento")}</option>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {tv(m.date)} · {tv(m.title)} · {money(Number(m.amount))}
                </option>
              ))}
            </select>
            <small>{t("Vincular conserva su importe, cuenta y fecha.")}</small>
          </label>
        ) : mode === "payment" && financial ? (
          <label>
            {t("Cobro registrado")}<select name="debt_payment_id" required>
              <option value="">{t("Selecciona un cobro")}</option>
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {tv(snapshot.debts.find((d) => d.id === p.debt_id)?.person)} ·{" "}
                  {tv(p.date)} · {money(Number(p.amount))}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            {(financial || kind === "incidencia") && (
              <AmountField
                label={
                  kind === "incidencia"
                    ? t("Importe esperado (opcional)")
                    : t("Importe")
                }
                key={kind}
                name="amount"
                value={kind==='cobro'?suggestedAmount:undefined}
                required={financial}
              />
            )}
            <label>
              {t("Fecha")}<input
                name="date"
                type="date"
                defaultValue={new Date().toLocaleDateString("en-CA", {
                  timeZone: "Europe/Madrid",
                })}
                required
              />
            </label>
            {financial && !bonus && (
              <label>
                {t("Cuenta que")} {tv(incoming ? "recibe" : "paga")}
                <select name="account_id" required>
                  <option value="">{t("Selecciona una cuenta")}</option>
                  {snapshot.accounts
                    .filter((a) => kind === "cobro" || a.scope === "business")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {tv(a.name)}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {mode === "debt" && (
              <label>
                {t("Deuda")}<select name="debt_id" required>
                  <option value="">{t("Selecciona la deuda")}</option>
                  {snapshot.debts
                    .filter((d) => d.direction === "me_deben")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {tv(d.person)} · {tv(d.title)}
                      </option>
                    ))}
                </select>
                <small>
                  {t("El cobro actualiza la deuda y cuenta una sola vez.")}</small>
              </label>
            )}
          </>
        ))}
        {["existing", "payment"].includes(mode) && (
          <input
            name="date"
            type="hidden"
            value={new Date().toLocaleDateString("en-CA", {
              timeZone: "Europe/Madrid",
            })}
          />
        )}
        <label>
          {tv(kind === "nota" ? t("Nota") : t("Nota (opcional)"))}
          <textarea
            name="note"
            rows={3}
            required={kind === "nota"}
            maxLength={2000}
            placeholder={t("Detalles que quieras conservar")}
          />
        </label>
        {bonus && (
          <p className="mg-hint">
            {t("Este registro solo actualiza el bono. No modifica ninguna cuenta.")}</p>
        )}
        {kind === "incidencia" && (
          <p className="mg-hint">
            {t("Abrir una incidencia no registra dinero recibido ni pagado.")}</p>
        )}
        {error && (
          <p role="alert" className="mg-error">
            {tv(error)}
          </p>
        )}
      </div>
      <footer>
        <button className="primary" disabled={busy}>
          {tv(busy
            ? t("Guardando…")
            : mode === "existing" || mode === "payment"
              ? t("Vincular registro")
              : t("Guardar registro"))}
        </button>
      </footer>
    </form>
  );
}

export function TransferForm({
  snapshot,
  busy,
  onSave,
  deposit=false,
}: {
  snapshot: ManagementSnapshot;
  busy: boolean;
  deposit?: boolean;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const requestId = useRef(crypto.randomUUID()),
    [error, setError] = useState("");
  const sources=deposit?snapshot.accounts.filter(a=>a.scope!=='business'&&a.kind!=='Ahorro'):snapshot.accounts;
  const destinations=deposit?snapshot.accounts.filter(a=>a.scope==='business'):snapshot.accounts;
  const [source,setSource]=useState(()=>deposit?(sources.find(a=>/bbva/i.test(a.name))?.id||sources[0]?.id||''):(snapshot.accounts.find(a=>a.scope==='business')?.id||''));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const from=value(f,'account_id'),to=value(f,'destination_account_id');
      if(!from||!to||from===to)throw new Error(t("Elige dos cuentas distintas."));
      if(deposit&&(!sources.some(a=>a.id===from)||!destinations.some(a=>a.id===to)))throw new Error(t("Elige una cuenta de origen y una cuenta de Caja."));
      await onSave({
        account_id: value(f, "account_id"),
        destination_account_id: value(f, "destination_account_id"),
        amount: readMoney(f, "amount"),
        date: value(f, "date"),
        note: value(f, "note"),
        request_id: requestId.current,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form className="mg-form" onSubmit={submit}>
      <div className="mg-form-main">
        <p className="mg-hint">
          {tv(deposit?t("Pasa dinero de tus cuentas a Efectivo o Banco de Caja. Después registra las compras de pedidos desde esa caja."):t("Mueve dinero entre Efectivo, Banco y tus cuentas personales."))} {t("No es un ingreso, un gasto ni una venta.")}</p>
        {[
          ["account_id", "Desde"],
          ["destination_account_id", "Hacia"],
        ].map(([name, label]) => (
          <label key={name}>
            {tv(label)}
            <select
              name={name}
              required
              defaultValue={
                name === "account_id"
                  ? source
                  : deposit?(destinations.find(a=>a.kind==='Banco')?.id||destinations[0]?.id||''):""
              }
              onChange={name==='account_id'?e=>setSource(e.target.value):undefined}
            >
              <option value="">{t("Selecciona una cuenta")}</option>
              {(name==='account_id'?sources:destinations).map((a) => (
                <option key={a.id} value={a.id} disabled={name==='destination_account_id'&&a.id===source}>
                  {tv(a.name)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <AmountField name="amount" label={t("Importe")} required />
        <label>
          {t("Fecha")}<input
            type="date"
            name="date"
            defaultValue={new Date().toLocaleDateString("en-CA", {
              timeZone: "Europe/Madrid",
            })}
            required
          />
        </label>
        <label>
          {t("Concepto")}<input
            name="note"
            defaultValue={deposit?'Añadir dinero a Caja':"Traspaso · Gestiones"}
            required
            maxLength={160}
          />
        </label>
        {error && (
          <p role="alert" className="mg-error">
            {tv(error)}
          </p>
        )}
      </div>
      <footer>
        <button className="primary" disabled={busy}>
          {tv(busy ? t("Guardando…") : deposit?t("Añadir dinero a Caja"):t("Guardar traspaso"))}
        </button>
      </footer>
    </form>
  );
}

export function VintedSaleForm({item,busy,onSave}:{item:ManagementItem;busy:boolean;onSave:(data:ManagementData)=>Promise<void>}){
 const [error,setError]=useState('');
 return <form className="mg-form" onSubmit={async e=>{e.preventDefault();setError('');try{const form=new FormData(e.currentTarget),price=readMoney(form,'price');if(price<=0)throw new Error(t("Indica el precio de venta."));await onSave({...item.data,sale:'Vendido',person:value(form,'buyer'),price,sale_date:value(form,'sale_date')});}catch(error){setError((error as Error).message);}}}><div className="mg-form-main"><p className="mg-context">{tv(item.data.model)}</p><label>{t("Comprador o usuario de Vinted")}<input name="buyer" maxLength={100} defaultValue={item.data.person} placeholder={t("Puedes añadirlo ahora o después")} autoFocus/></label><AmountField label={t("Precio de venta")} name="price" value={item.data.price} required/><label>{t("Fecha de venta")}<input name="sale_date" type="date" required defaultValue={item.data.sale_date||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}/></label><p className="mg-hint">{t("Guarda que está vendido y enviado al comprador. No registra dinero en Caja: usa «Registrar cobro» cuando recibas el pago.")}</p>{error&&<p className="mg-error" role="alert">{tv(error)}</p>}</div><footer><button className="primary" disabled={busy}>{tv(busy?t("Guardando…"):t("Marcar vendido y enviado"))}</button></footer></form>;
}
