import { t, tv } from "@/lib/i18n";
import { ArrowLeftRight, Banknote, Check, CircleAlert, Clock3, Package, RefreshCw, Truck, X } from 'lucide-react';
import { managementStatusLabels, orderDelivered, orderHasBuyer, orderShipped, isVintedOrder, type ManagementData, type OrderPaymentState } from '@/lib/management';
const icons={refund:RefreshCw,exchange:ArrowLeftRight,check:Check,review:CircleAlert,clock:Clock3,package:Package,truck:Truck,cancel:X};
export default function OrderStatus({data,payment,compact=false,overviewState}:{data:ManagementData;payment?:OrderPaymentState;compact?:boolean;overviewState?:string}) {
  const paymentText=payment&&({unpaid:'Sin cobrar',partial:'Cobro parcial',paid:'Cobrado',review:'Por confirmar','no-price':'Precio sin definir','no-buyer':'Sin comprador',cancelled:'Cancelado'}[payment]);
  const handedOff=data.tracking!=='Cancelado'&&(isVintedOrder(data)?orderShipped(data):data.activity==='amigos'&&orderDelivered(data));
  const labels=managementStatusLabels(data).filter(status=>status.key!=='tracking'||!handedOff);
  if(overviewState){
    const tracking=labels.find(status=>status.key==='tracking');
    const rows:Array<{key:string;label:string;value:string;tone:string;Icon:typeof Package}>=[];
    if(tracking)rows.push({key:'tracking',label:t("Seguimiento"),value:tracking.label,tone:tracking.tone,Icon:icons[tracking.icon]});
    if(data.sale==='Para mí')rows.push({key:'receipt',label:t("Recepción"),value:orderDelivered(data)?'Recibido':'Por recibir',tone:orderDelivered(data)?'success':'warning',Icon:orderDelivered(data)?Check:Package});
    else{
      const sent=isVintedOrder(data)?orderShipped(data):orderDelivered(data);
      rows.push({key:'delivery',label:data.activity==='amigos'?'Entrega al amigo':'Envío al comprador',value:data.tracking==='Cancelado'?'Cancelado':sent?(isVintedOrder(data)?'Enviado':'Entregado'):orderHasBuyer(data)?(isVintedOrder(data)?'Por enviar':'Por entregar'):'Sin venta asignada',tone:data.tracking==='Cancelado'?'neutral':sent?'success':orderHasBuyer(data)?'warning':'neutral',Icon:sent?Check:Truck});
      if(paymentText)rows.push({key:'payment',label:t("Cobro"),value:paymentText,tone:payment==='paid'?'success':payment==='unpaid'||payment==='partial'||payment==='review'||payment==='no-price'?'warning':'neutral',Icon:payment==='paid'?Check:Banknote});
    }
    for(const status of labels.filter(status=>['sale','refund','exchange'].includes(status.key)))rows.push({key:status.key,label:status.key==='sale'?'Venta':status.key==='refund'?'Reembolso':'Intercambio',value:status.key==='sale'?status.label:status.key==='refund'?(data.refund_status==='received'?'Recibido':'Pedido'):(data.exchange_status==='completed'?'Completado':'Pedido'),tone:status.tone,Icon:icons[status.icon]});
    return <div className="mg-order-status mg-status-rows" aria-label={t("Seguimiento, entrega y cobro")}>{rows.map(({key,label,value,tone,Icon})=><div className={'mg-status-row mg-status-row--'+key} key={key}><span className="mg-status-row-label">{tv(label)}</span><span className={'mg-status-chip mg-status-'+tone}><Icon size={15} aria-hidden="true"/>{tv(value)}</span></div>)}</div>;
  }
  const paymentLabel=data.sale!=='Para mí'&&payment&&({unpaid:'Sin cobrar',partial:'Cobro parcial',paid:'Cobrado',review:'Cobro por confirmar','no-price':'Precio sin definir','no-buyer':'Sin comprador',cancelled:''}[payment]);
  const shown=compact?labels.filter(label=>label.key==='tracking'||(label.key==='refund'||label.key==='exchange')&&label.tone!=='success').slice(0,2):labels;
  return <div className="mg-order-status" aria-label={t("Estado del pedido")}>{shown.map(status=>{
    const Icon=icons[status.icon];
    return <span key={status.key} className={`mg-status-chip mg-status-${status.tone}`}><Icon size={15} aria-hidden="true"/>{tv(status.label)}</span>;
  })}{paymentLabel&&(!compact||shown.length<2)&&<span className={`mg-status-chip mg-status-${payment==='paid'?'success':payment==='unpaid'||payment==='partial'?'warning':'neutral'}`}>{tv(payment==='paid'?<Check size={15} aria-hidden="true"/>:<Banknote size={15} aria-hidden="true"/>)}{tv(paymentLabel)}</span>}</div>;
}
