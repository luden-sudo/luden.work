import { totalAmounts,formatEuros as money } from "./finance";
export {money};

export const trackingStates = [
  "Por revisar",
  "Por pedir",
  "Pedido",
  "En camino",
  "En casa",
  "Enviado",
  "Entregado",
  "Cancelado",
] as const;
export const saleStates = ["Por revisar", "Para mí", "Disponible", "Reservado", "Vendido"] as const;
export const eventKinds = [
  "compra",
  "gasto",
  "cobro",
  "reembolso_proveedor",
  "devolucion_cliente",
  "aportacion",
  "recuperacion",
  "nota",
  "incidencia",
  "estado",
  "anulacion",
] as const;
export type ManagementData = {
  activity: "ventas" | "amigos" | "bonos";
  model: string;
  color: string;
  size: string;
  person: string;
  email: string;
  phone_number?: string;
  phone_cost?: number;
  package_name?:string;
  refund_status?:'none'|'requested'|'received';
  exchange_status?:'none'|'requested'|'completed';
  refund_original_cost?:number;
  refund_cost_adjusted?:boolean;
  order_ref: string;
  purchase_date: string;
  arrival_date: string;
  sale_date: string;
  delivery_date: string;
  delivery_status?: 'pending' | 'delivered';
  shipping_status?: 'pending' | 'sent';
  shipping_date?: string;
  cost: number;
  price: number;
  expenses: number;
  tracking: string;
  sale: string;
  next_action: string;
  review_date: string;
  photo: string;
  original?: Record<string, unknown>;
  warnings?: string[];
  source_sheet?: string;
  source_row?: number;
  deleted_at?: string;
};
export type ManagementItem = {
  id: string;
  profile: string;
  data: ManagementData;
  version: number;
  source_key: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
export type ManagementEvent = {
  id: string;
  profile: string;
  item_id: string | null;
  kind: string;
  amount: number;
  date: string;
  note: string;
  account_id: string | null;
  transaction_id: string | null;
  debt_payment_id: string | null;
  request_id: string;
  voided: boolean;
  created_at: string;
  details: Record<string, unknown>;
};
export type ManagementAccount = {
  id: string;
  name: string;
  kind: string;
  scope?: string;
  opening_balance: number;
};
export type ManagementMovement = {
  id: string;
  title: string;
  amount: number;
  type: string;
  date: string;
  account_id: string;
  destination_account_id?: string | null;
  created_at?: string;
};
export type ManagementSnapshot = {
  revision?: string;
  items: ManagementItem[];
  events: ManagementEvent[];
  accounts: ManagementAccount[];
  movements: ManagementMovement[];
  debts: {
    id: string;
    person: string;
    title: string;
    total: number;
    direction: string;
  }[];
  debtPayments: {
    id: string;
    debt_id: string;
    account_id: string;
    amount: number;
    date: string;
  }[];
};
export function resolveManagementEvents(snapshot:ManagementSnapshot,events:ManagementEvent[]=snapshot.events):ManagementEvent[]{
  const movements=new Map(snapshot.movements.map(m=>[m.id,m])),payments=new Map(snapshot.debtPayments.map(p=>[p.id,p]));
  return events.map(event=>{
    const source=event.transaction_id?movements.get(event.transaction_id):event.debt_payment_id?payments.get(event.debt_payment_id):null;
    if((event.transaction_id||event.debt_payment_id)&&!source)return {...event,voided:true};
    return source?{...event,amount:Number(source.amount),account_id:source.account_id,date:source.date}:event;
  });
}
export function emptyManagement(
  activity: ManagementData["activity"] = "ventas",
): ManagementData {
  return {
    activity,
    model: "",
    color: "",
    size: "",
    person: "",
    email: "",
    package_name:'',
    order_ref: "",
    purchase_date: "",
    arrival_date: "",
    sale_date: "",
    delivery_date: "",
    cost: 0,
    price: 0,
    expenses: 0,
    tracking: activity==='bonos'?"Por revisar":"Pedido",
    sale: activity==='amigos'?'Vendido':activity==='ventas'?"Para mí":"Por revisar",
    next_action: "",
    review_date: "",
    photo: "",
  };
}
export function itemTotals(item: ManagementItem, events: ManagementEvent[]) {
  const own = events.filter((e) => e.item_id === item.id && !e.voided);
  const sum = (kind: string) =>
    totalAmounts(own.filter((e) => e.kind === kind).map((e) => e.amount));
  const collected = totalAmounts([sum("cobro"), -sum("devolucion_cliente")]);
  const paid = totalAmounts([sum("compra"), sum("gasto")]);
  const returned = sum("reembolso_proveedor");
  const historicalBonus=item.data.activity==='bonos'&&!!item.data.source_sheet;
  const contribution = totalAmounts([sum("aportacion"),historicalBonus?item.data.cost:0]),
    recovered = totalAmounts([sum("recuperacion"),historicalBonus?item.data.price:0]);
  const incidents = own.filter((e) => e.kind === "incidencia");
  const unresolved = incidents.filter(
    (e) =>
      !own.some(
        (close) =>
          close.kind === "estado" && close.details.incident_id === e.id,
      ),
  );
  const refundDue = totalAmounts(
    unresolved
      .filter((e) => e.details.type === "Reembolso proveedor")
      .map((e) =>
        Math.max(
          0,
          Number(e.amount) -
            totalAmounts(
              own
                .filter(
                  (r) =>
                    r.kind === "reembolso_proveedor" &&
                    r.details.incident_id === e.id,
                )
                .map((r) => r.amount),
            ),
        ),
      ),
  );
  const economicCost = totalAmounts([
    orderTotalCost(item.data),
    item.data.refund_cost_adjusted?0:-returned,
  ]);
  const cancelled = item.data.tracking === 'Cancelado';
  const sold = !cancelled && (item.data.sale === "Vendido" || (item.data.activity==='amigos' && item.data.sale!=='Por revisar'));
  const personal=item.data.activity==='ventas'&&item.data.sale==='Para mí';
  const expectedProfit=cancelled||personal?0:totalAmounts([item.data.price,-sum('devolucion_cliente'),-economicCost]);
  return {
    collected,
    paid,
    returned,
    contribution,
    recovered,
    remaining: !orderHasBuyer(item.data)||item.data.tracking==='Cancelado'?0:Math.max(0, totalAmounts([item.data.price, -sum('cobro')])),
    payable: Math.max(
      0,
      ['Cancelado','Por revisar'].includes(item.data.tracking)?0:totalAmounts([orderCashCost(item.data), -paid]),
    ),
    profit: sold ? expectedProfit : 0,
    expectedProfit,
    stock: !personal && !sold && !['Cancelado','Por revisar'].includes(item.data.tracking)&&item.data.sale!=='Por revisar' ? economicCost : 0,
    cashFlow: totalAmounts([collected, returned, -paid]),
    unresolved,
    refundDue,
  };
}
export function managementSummary(
  items: ManagementItem[],
  events: ManagementEvent[],
) {
  const sales = items.filter((i) => i.data.activity !== "bonos");
  const all = sales.map((i) => itemTotals(i, events));
  return {
    collected: totalAmounts(all.map((i) => i.collected)),
    paid: totalAmounts(all.map((i) => i.paid)),
    remaining: totalAmounts(all.map((i) => i.remaining)),
    payable: totalAmounts(all.map((i) => i.payable)),
    profit: totalAmounts(all.map((i) => i.profit)),
    stock: totalAmounts(all.map((i) => i.stock)),
    cashFlow: totalAmounts(all.map((i) => i.cashFlow)),
    refundDue: totalAmounts(all.map((i) => i.refundDue)),
    returned: totalAmounts(all.map((i) => i.returned)),
    agreed: totalAmounts(
      sales
        .filter((i) => i.data.tracking !== 'Cancelado' && orderHasBuyer(i.data))
        .map((i) => i.data.price),
    ),
  };
}
export const ORDER_PHONE_COST=0.66;
export function orderCashCost(data:ManagementData){return totalAmounts([data.cost,data.expenses]);}
export function orderTotalCost(data:ManagementData){return totalAmounts([data.cost,data.expenses,data.phone_cost??0]);}
// Imported rows run oldest → newest; edits must never reshuffle the list.
export function compareManagementItems(a: ManagementItem, b: ManagementItem) {
  const importedA = a.source_key?.startsWith('xlsx:') ?? false;
  const importedB = b.source_key?.startsWith('xlsx:') ?? false;
  if (importedA !== importedB) return importedA ? 1 : -1;
  return b.created_at.localeCompare(a.created_at)
    || (importedA ? (b.data.source_row || 0) - (a.data.source_row || 0) : 0)
    || b.id.localeCompare(a.id);
}
export function managementAmountLabel(item: ManagementItem, value: number) {
  return value === 0 && item.source_key?.startsWith('xlsx:') && !!item.data.warnings?.length
    ? 'Sin confirmar' : money(value);
}
type OrderStatusLabel={key:string;label:string;tone:'neutral'|'info'|'warning'|'success'|'home';icon:'refund'|'exchange'|'check'|'review'|'clock'|'package'|'truck'|'cancel'};
function orderAtHome(data:ManagementData){return data.tracking==='En casa'&&(data.activity==='amigos'||isVintedOrder(data));}
export function orderHasBuyer(data:ManagementData){return ['Reservado','Vendido'].includes(data.sale)||(data.activity==='amigos'&&data.sale!=='Por revisar');}
export function orderDelivered(data:ManagementData){return data.delivery_status==='delivered'||(!data.delivery_status&&data.tracking==='Entregado');}
export function orderShipped(data:ManagementData){if(data.sale==='Para mí')return false;return data.shipping_status?data.shipping_status==='sent':data.tracking==='Enviado'||orderDelivered(data);}
export function isVintedOrder(data:ManagementData){return data.activity==='ventas'&&data.sale!=='Para mí';}
export function syncVintedShipment(data:ManagementData):ManagementData{
  if(!isVintedOrder(data)||data.tracking==='Cancelado')return data;
  if(data.shipping_status==='sent'||data.tracking==='Enviado')return {...data,shipping_status:'sent',tracking:'Enviado',sale:'Vendido'};
  return data;
}
export type OrderPaymentState='unpaid'|'partial'|'paid'|'review'|'no-price'|'no-buyer'|'cancelled';
export function orderPaymentState(item:ManagementItem,events:ManagementEvent[]):OrderPaymentState{
  if(item.data.tracking==='Cancelado')return 'cancelled';
  if(item.data.sale==='Por revisar'||item.data.tracking==='Por revisar')return 'review';
  if(!orderHasBuyer(item.data)){const collected=itemTotals(item,events).collected;return collected>0?(item.data.price>0&&collected>=item.data.price?'paid':'partial'):'no-buyer';}
  if(item.data.price<=0)return 'no-price';
  const totals=itemTotals(item,events);
  return totals.remaining<=0?'paid':totals.collected>0?'partial':'unpaid';
}
export function orderVisualState(item:ManagementItem,events:ManagementEvent[]):{key:string;label:string} {
  const data=item.data;
  if(data.tracking==='Cancelado')return {key:'cancelled',label:'Cancelado'};
  if(data.refund_status==='requested')return {key:'refund-pending',label:'Reembolso pedido'};
  if(data.exchange_status==='requested')return {key:'exchange-pending',label:'Intercambio pedido'};
  if(data.refund_status==='received')return {key:'refund-done',label:'Reembolso marcado como recibido'};
  if(data.exchange_status==='completed')return {key:'exchange-done',label:'Intercambio completado'};
  const vinted=isVintedOrder(data),delivered=vinted?orderShipped(data):orderDelivered(data),totals=itemTotals(item,events);
  if(data.sale==='Para mí')return delivered?{key:'complete',label:'Recibido'}:{key:'pending',label:'Pendiente de recibir'};
  if(orderAtHome(data)&&!delivered)return {key:'home',label:vinted?'En casa · por enviar':'En casa · por entregar'};
  const paid=orderHasBuyer(data)&&data.price>0&&totals.remaining<=0;
  if(!orderHasBuyer(data)&&totals.collected>0)return {key:'partial',label:'Cobro registrado · venta pendiente'};
  if(delivered&&paid)return {key:'complete',label:vinted?'Enviado y cobrado':'Entregado y cobrado'};
  if(delivered)return {key:'partial',label:vinted?'Enviado · falta cobrar':'Entregado · falta cobrar'};
  if(paid)return {key:'partial',label:vinted?'Cobrado · falta enviar':'Cobrado · falta entregar'};
  if(totals.collected>0)return {key:'partial',label:vinted?'Cobro parcial · falta enviar':'Cobro parcial · falta entregar'};
  if(data.tracking==='Por revisar'||data.sale==='Por revisar')return {key:'review',label:'Datos por revisar'};
  return {key:'pending',label:orderHasBuyer(data)?(vinted?'Pendiente de envío y cobro':'Pendiente de entrega y cobro'):'Aún sin vender'};
}
export function managementStatusLabels(data:ManagementData):OrderStatusLabel[]{
  const result:OrderStatusLabel[]=[];
  if(data.refund_status==='requested')result.push({key:'refund',label:'Reembolso pedido',tone:'warning',icon:'refund'});
  if(data.exchange_status==='requested')result.push({key:'exchange',label:'Intercambio pedido',tone:'info',icon:'exchange'});
  const tracking=data.tracking==='Entregado'?'En casa':data.tracking;
  result.push({key:'tracking',label:tracking==='Por revisar'?'Revisar datos':tracking,tone:orderAtHome(data)?'home':tracking==='Entregado'?'success':tracking==='Por revisar'?'warning':['Pedido','En camino','En casa','Enviado'].includes(tracking)?'info':'neutral',icon:tracking==='Entregado'?'check':tracking==='Por revisar'?'review':tracking==='Cancelado'?'cancel':tracking==='Por pedir'?'clock':['En camino','Enviado'].includes(tracking)?'truck':'package'});
  if(data.refund_status==='received')result.push({key:'refund',label:'Reembolso recibido',tone:'success',icon:'check'});
  if(data.exchange_status==='completed')result.push({key:'exchange',label:'Intercambio completado',tone:'success',icon:'check'});
  if(data.activity==='amigos'&&data.tracking!=='Cancelado')result.push({key:'delivery',label:orderDelivered(data)?'Entregado al amigo':'Por entregar al amigo',tone:orderDelivered(data)?'success':'neutral',icon:orderDelivered(data)?'check':'package'});
  if(data.sale==='Para mí')result.push({key:'personal',label:'Para mí',tone:'neutral',icon:'package'});
  if(data.activity!=='amigos'&&['Reservado','Vendido'].includes(data.sale))result.push({key:'sale',label:data.sale,tone:'neutral',icon:'package'});
  if(data.activity!=='amigos'&&data.sale!=='Para mí'&&(orderHasBuyer(data)||orderShipped(data))&&data.tracking!=='Cancelado')result.push({key:'delivery',label:orderShipped(data)?'Enviado al comprador':'Por enviar al comprador',tone:orderShipped(data)?'success':'neutral',icon:orderShipped(data)?'check':'package'});
  return result;
}
export function splitExpense(amount: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("Añade al menos un artículo.");
  const cents = Math.round(amount * 100),
    base = Math.floor(cents / count),
    remainder = cents % count;
  return Array.from(
    { length: count },
    (_, i) => (base + (i < remainder ? 1 : 0)) / 100,
  );
}
