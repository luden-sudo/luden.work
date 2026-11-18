// Notifications run independently of the open page. Financial/API data is never cached here.
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{};}catch{/* Ignore malformed payloads. */}
  event.waitUntil(self.registration.showNotification(data.title||'Mi día',{
    body:data.body||'Tienes una actividad pendiente.',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',
    tag:data.tag||'aurum-day',data:{url:data.url==='/dinero?tab=deudas'?data.url:'/hoy'},
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url==='/dinero?tab=deudas'?'/dinero?tab=deudas':'/hoy';
  const url=new URL(target,self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    for(const client of clients)if(new URL(client.url).origin===self.location.origin){await client.navigate(url);return client.focus();}
    return self.clients.openWindow(url);
  }));
});
