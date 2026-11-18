import {
  admin,
  authorized,
  requireProfile,
  noStore,
  fail,
} from "@/lib/day-server";
import {
  emptyManagement,
  trackingStates,
  saleStates,
  syncVintedShipment,
  eventKinds,
  type ManagementData,
} from "@/lib/management";
import { validDay } from "@/lib/day-plan";
import { previewWorkbook } from "@/lib/management-import";

const uuid = (v: unknown) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
async function allRows(table:string,profile?:string,itemId?:string){
  const rows:Record<string,unknown>[]=[];
  for(let offset=0;;offset+=1000){
    let query=admin().from(table).select('*').order('id').range(offset,offset+999);
    if(profile)query=query.eq('profile',profile);
    if(itemId)query=query.eq('item_id',itemId);
    const result=await query;
    if(result.error)throw new Error('No se pudieron cargar las gestiones. Revisa la configuración y vuelve a intentar.');
    rows.push(...result.data);
    if(result.data.length<1000)return rows;
  }
}
function checkData(input: unknown): ManagementData {
  if (!input || typeof input !== "object")
    throw new Error("Completa los datos de la ficha.");
  const data = input as ManagementData;
  if(data.phone_number!==undefined&&(typeof data.phone_number!=='string'||data.phone_number.length>60))throw new Error('Revisa el número de teléfono.');
  if(data.phone_cost!==undefined&&(!Number.isFinite(data.phone_cost)||data.phone_cost<0||data.phone_cost>0.66||Math.abs(data.phone_cost*100-Math.round(data.phone_cost*100))>0.00001))throw new Error('Revisa el coste del teléfono.');
  if(data.shipping_status!==undefined&&!['pending','sent'].includes(data.shipping_status))throw new Error('Revisa el estado del envío.');
  if(data.shipping_date!==undefined&&data.shipping_date!==''&&!validDay(data.shipping_date))throw new Error('Revisa la fecha de envío.');
  data.package_name ??='';
  if (
    !["ventas", "amigos", "bonos"].includes(data.activity) ||
    typeof data.model !== "string" ||
    !data.model.trim() ||
    data.model.length > 160
  )
    throw new Error("Escribe un modelo o plataforma, máximo 160 caracteres.");
  for (const key of Object.keys(
    emptyManagement(),
  ) as (keyof ManagementData)[]) {
    if (["cost", "price", "expenses"].includes(key)) {
      const n = data[key];
      if (
        typeof n !== "number" ||
        !Number.isFinite(n) ||
        n < 0 ||
        n > 999999999 ||
        Math.abs(n * 100 - Math.round(n * 100)) > 0.00001
      )
        throw new Error("Revisa los importes: máximo dos decimales.");
    } else if (typeof data[key] !== "string" || String(data[key]).length > 2000)
      throw new Error("Revisa los campos de texto.");
  }
  for (const key of [
    "purchase_date",
    "arrival_date",
    "sale_date",
    "delivery_date",
    "review_date",
  ] as const)
    if (data[key] && !validDay(data[key]))
      throw new Error("Revisa las fechas.");
  if (
    !trackingStates.includes(
      data.tracking as (typeof trackingStates)[number],
    ) ||
    !saleStates.includes(data.sale as (typeof saleStates)[number])
  )
    throw new Error("Revisa el estado.");
  if (data.photo && !/^https:\/\//i.test(data.photo))
    throw new Error("La foto debe ser un enlace HTTPS.");
  Object.assign(data,syncVintedShipment(data));
  return data;
}
export async function GET(request: Request) {
  if (!(await authorized(request))) return fail("Introduce tu PIN.", 401);
  try {
    const profile = await requireProfile();
    const params=new URL(request.url).searchParams;
    if(params.has('revision')){
      const result=await admin().from('aurum_management_revisions').select('revision').eq('profile',profile).single();
      if(result.error)throw new Error('No se pudo comprobar la sincronización.');
      return Response.json({revision:String(result.data.revision)},{headers:noStore});
    }
    if(params.has('history')){
      const id=params.get('history');if(!uuid(id))return fail('Pedido no válido.');
      const item=await admin().from('aurum_management_items').select('id').eq('id',id).eq('profile',profile).is('data->>deleted_at',null).maybeSingle();
      if(item.error)throw new Error('No se pudo comprobar el pedido.');
      if(!item.data)return fail('Pedido no encontrado.',404);
      const events=await allRows('aurum_management_events',profile,id!);
      events.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||String(b.id).localeCompare(String(a.id)));
      return Response.json({events},{headers:noStore});
    }
    const links=params.has('links');
    const result=await admin().rpc(links?'aurum_management_links':'aurum_management_snapshot',{p_profile:profile});
    if(result.error)throw new Error('No se pudieron cargar las gestiones. Vuelve a intentar.');
    return Response.json(links?{links:result.data}:result.data,{headers:noStore});
  } catch (e) {
    return fail((e as Error).message, 503);
  }
}
export async function POST(request: Request) {
  if (!(await authorized(request))) return fail("Introduce tu PIN.", 401);
  try {
    if (Number(request.headers.get("content-length")) > 5_500_000)
      return fail("El archivo supera 5 MB.", 413);
    const profile = await requireProfile();
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData(),
        file = form.get("file");
      if (
        !(file instanceof File) ||
        file.size > 5_000_000 ||
        !file.name.toLowerCase().endsWith(".xlsx")
      )
        return fail("Selecciona un archivo .xlsx de hasta 5 MB.");
      const rows = await previewWorkbook(await file.arrayBuffer());
      const existing = await admin()
        .from("aurum_management_items")
        .select("source_key,data")
        .eq("profile", profile);
      if (existing.error)
        throw new Error("No se pudo comprobar el histórico existente.");
      const keys = new Set(existing.data.map((i) => i.source_key));
      return Response.json(
        {
          rows: rows.map((row) => ({
            ...row,
            selected: !keys.has(row.source_key),
            imported: keys.has(row.source_key),
            duplicate:
              row.duplicate ||
              existing.data.some(
                (i) =>
                  i.data.model === row.data.model &&
                  i.data.person === row.data.person &&
                  i.data.size === row.data.size,
              ),
          })),
        },
        { headers: noStore },
      );
    }
    const text = await request.text();
    if (text.length > 2_000_000) return fail("Demasiados datos.", 413);
    const { action, payload } = JSON.parse(text);
    if(['cash_edit','cash_delete','delete_order'].includes(action)){
      if(!payload||!uuid(payload.id))return fail('Registro no válido.');
      if(action==='delete_order'&&(!Number.isInteger(payload.version)||payload.version<1))return fail('Actualiza el pedido.');
      if(action==='cash_edit'&&(!validDay(payload.date)||typeof payload.title!=='string'||!payload.title.trim()||payload.title.length>160||!Number.isFinite(payload.amount)||payload.amount<=0||payload.amount>999999999||Math.abs(payload.amount*100-Math.round(payload.amount*100))>0.00001||!uuid(payload.account_id)||(payload.destination_account_id&&!uuid(payload.destination_account_id))))return fail('Revisa los datos del movimiento.');
      const result=await admin().rpc('aurum_management_cash',{p_profile:profile,p_action:action,p:payload});
      if(result.error)throw new Error(result.error.message);
      return Response.json({result:result.data},{headers:noStore});
    }
    if (
      ![
        "setup",
        "save",
        "save_many",
        "import",
        "archive",
        "event",
        "void",
        "transfer",
        "case_status",
      ].includes(action) ||
      !payload ||
      typeof payload !== "object"
    )
      return fail("Operación no válida.");
    if (action === "save") {
      checkData(payload.data);
      if (payload.id && !uuid(payload.id)) return fail("Ficha no válida.");
      if (!payload.id && !payload.source_key)
        return fail("Falta el identificador de guardado.");
    }
    if (action === "import"||action==='save_many') {
      if (!Array.isArray(payload.items) || payload.items.length > 2000)
        return fail("Importación no válida.");
      for (const row of payload.items) {
        checkData(row.data);
        if (
          typeof row.source_key !== "string" ||
          !(action==='import'?row.source_key.startsWith("xlsx:"):row.source_key.startsWith('manual:')||row.id&&uuid(row.id))
        )
          return fail("Falta el origen de una fila.");
      }
    }
    if ((action==='save'&&!payload.id&&payload.data.activity!=='bonos'||action==='save_many'&&payload.items.some((row:{id?:string;data:ManagementData})=>!row.id&&row.data.activity!=='bonos'))&&!uuid(payload.payment_account_id))return fail('Elige la cuenta de Caja desde la que pagas el pedido.');
    if (action === "archive" && !uuid(payload.id))
      return fail("Ficha no válida.");
    if(action==='case_status'&&(!uuid(payload.id)||!uuid(payload.request_id)||!['refund','exchange'].includes(payload.case_type)||!(payload.case_type==='refund'?['none','requested','received']:['none','requested','completed']).includes(payload.status)))return fail('Revisa el estado del reembolso o intercambio.');
    if (
      ["event", "void", "transfer"].includes(action) &&
      !uuid(payload.request_id)
    )
      return fail("Falta el identificador de operación.");
    if (action === "event") {
      if (!uuid(payload.item_id) || !eventKinds.includes(payload.kind))
        return fail("Revisa el tipo de registro.");
      if (
        !validDay(payload.date) ||
        typeof payload.note !== "string" ||
        payload.note.length > 2000
      )
        return fail("Revisa la fecha y la nota.");
      if (
        !Number.isFinite(payload.amount) ||
        payload.amount < 0 ||
        payload.amount > 999999999
      )
        return fail("Revisa el importe.");
      if (
        payload.amount > 0 &&
        Math.abs(payload.amount * 100 - Math.round(payload.amount * 100)) >
          0.00001
      )
        return fail("Introduce hasta dos decimales.");
      for (const key of [
        "account_id",
        "transaction_id",
        "debt_id",
        "debt_payment_id",
      ])
        if (payload[key] && !uuid(payload[key]))
          return fail("Referencia no válida.");
    }
    if (action === "void" && !uuid(payload.id))
      return fail("Registro no válido.");
    if (
      action === "transfer" &&
      (!uuid(payload.account_id) ||
        !uuid(payload.destination_account_id) ||
        !validDay(payload.date) ||
        !Number.isFinite(payload.amount) ||
        payload.amount <= 0 ||
        payload.amount > 999999999 ||
        Math.abs(payload.amount * 100 - Math.round(payload.amount * 100)) >
          0.00001 ||
        typeof payload.note !== "string" ||
        !payload.note.trim() ||
        payload.note.length > 160)
    )
      return fail("Completa las cuentas, el concepto, la fecha y el importe.");
    const result = await admin().rpc("aurum_management_mutate", {
      p_profile: profile,
      p_action: action,
      p: payload,
    });
    if (result.error) {
      if (result.error.code === "23505")
        return fail("Este movimiento ya está vinculado. Actualiza la lista.");
      throw new Error(result.error.message);
    }
    return Response.json({ result: result.data }, { headers: noStore });
  } catch (e) {
    return fail((e as Error).message);
  }
}
