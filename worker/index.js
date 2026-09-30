const COOKIE="classroom_draw_session";
const MAX_AGE=60*60*12;

function enc(bytes){
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function dec(s){
  s=s.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4)s+="=";
  return Uint8Array.from(atob(s),c=>c.charCodeAt(0));
}
async function key(secret){
  return crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
async function sign(payload,secret){
  const sig=await crypto.subtle.sign("HMAC",await key(secret),new TextEncoder().encode(payload));
  return enc(new Uint8Array(sig));
}
async function makeSession(secret){
  const payload=enc(new TextEncoder().encode(JSON.stringify({exp:Math.floor(Date.now()/1000)+MAX_AGE})));
  return payload+"."+await sign(payload,secret);
}
async function validSession(request,secret){
  if(!secret)return false;
  const cookies=request.headers.get("Cookie")||"";
  const hit=cookies.split(";").map(v=>v.trim()).find(v=>v.startsWith(COOKIE+"="));
  if(!hit)return false;
  const value=hit.slice(COOKIE.length+1),parts=value.split(".");
  if(parts.length!==2)return false;
  const ok=await crypto.subtle.verify("HMAC",await key(secret),dec(parts[1]),new TextEncoder().encode(parts[0]));
  if(!ok)return false;
  try{
    const data=JSON.parse(new TextDecoder().decode(dec(parts[0])));
    return Number(data.exp)>Math.floor(Date.now()/1000);
  }catch{return false}
}
function page(message=""){
  const note=message?`<div class="error">${message}</div>`:"";
  return new Response(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>CLASSROOM DRAW</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;font-family:ui-rounded,"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo",sans-serif;color:#4a375d;background:radial-gradient(circle at 15% 10%,#ffd8e8,transparent 30%),radial-gradient(circle at 85% 15%,#cceaff,transparent 28%),linear-gradient(135deg,#fff7c7,#f8ecff 55%,#dff9f4)}
.card{width:min(430px,94vw);padding:30px;background:rgba(255,255,255,.9);border:4px solid #fff;border-radius:30px;box-shadow:0 24px 70px rgba(80,55,105,.18);text-align:center}
.kicker{font-weight:900;letter-spacing:.16em;color:#a174b2;font-size:.78rem}.title{margin:8px 0 4px;font-size:clamp(2rem,9vw,3.4rem);font-weight:1000;text-shadow:3px 3px 0 #ffe58f}.sub{margin:0 0 24px;color:#806c8d}.pin{width:100%;font-size:2rem;text-align:center;letter-spacing:.35em;padding:14px;border:3px solid #eadff0;border-radius:18px;outline:none}.pin:focus{border-color:#ac8cff;box-shadow:0 0 0 5px rgba(172,140,255,.14)}
.go{width:100%;margin-top:14px;padding:15px;border:3px solid #fff;border-radius:18px;background:linear-gradient(135deg,#ff78ad,#ac8cff,#75b9ff);color:#fff;font-weight:1000;font-size:1.15rem;box-shadow:0 8px 0 #71598a;cursor:pointer}.go:active{transform:translateY(5px);box-shadow:0 3px 0 #71598a}.error{margin:0 0 14px;padding:10px;background:#fff0f4;border-radius:12px;color:#b23c65;font-weight:800}
</style></head><body><main class="card"><div class="kicker">CLASSROOM DRAW</div><h1 class="title">WHO'S NEXT?</h1><p class="sub">4桁のパスワードを入力してください</p>${note}
<form method="post" action="/__auth/login"><input class="pin" name="password" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="current-password" required autofocus aria-label="4桁パスワード"><button class="go" type="submit">ENTER</button></form></main></body></html>`,{status:message?401:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
}
function redirect(location,headers={}){
  return new Response(null,{status:303,headers:{Location:location,"Cache-Control":"no-store",...headers}});
}
export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(!env.APP_PASSWORD||!env.SESSION_SECRET){
      return new Response("Cloudflare Secrets APP_PASSWORD / SESSION_SECRET are not configured.",{status:503,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
    }
    if(url.pathname==="/__auth/login"&&request.method==="POST"){
      const form=await request.formData();
      const password=String(form.get("password")||"");
      if(password!==String(env.APP_PASSWORD))return page("パスワードが違います");
      const token=await makeSession(env.SESSION_SECRET);
      return redirect("/",{"Set-Cookie":`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`});
    }
    if(url.pathname==="/__auth/logout"){
      return redirect("/",{"Set-Cookie":`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`});
    }
    if(!(await validSession(request,env.SESSION_SECRET)))return page();
    return env.ASSETS.fetch(request);
  }
};