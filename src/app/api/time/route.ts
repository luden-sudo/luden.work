export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return Response.json({epochMs:Date.now(),timeZone:"Europe/Madrid"},{
    headers:{"Cache-Control":"no-store, no-cache, must-revalidate","CDN-Cache-Control":"no-store","Vercel-CDN-Cache-Control":"no-store"}
  });
}
