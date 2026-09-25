import { apiRequest } from "../../shared/api/client";
import { getAuthHeaders } from "../auth/auth.storage";

const VISITOR_KEY="tea-analytics-visitor";
const SESSION_KEY="tea-analytics-session";
const SESSION_LAST_KEY="tea-analytics-session-last";
const SESSION_META_KEY="tea-analytics-session-meta";
const SESSION_TIMEOUT=30*60*1000;
let lastEventKey=""; let lastEventAt=0;

type EventType="page_view"|"product_view"|"add_to_cart"|"checkout_started";
type SessionMeta={landingPath:string;referrer:string|null;source:string;medium:string|null;campaign:string|null;content:string|null;term:string|null;deviceType:"mobile"|"tablet"|"desktop"};

function uuid(){return crypto.randomUUID();}
function deviceType():SessionMeta["deviceType"]{const w=window.innerWidth;return w<768?"mobile":w<1100?"tablet":"desktop";}
function sourceFromReferrer(referrer:string){if(!referrer)return"direct";try{const h=new URL(referrer).hostname.toLowerCase();if(h.includes("yandex"))return"yandex";if(h.includes("google"))return"google";if(h.includes("vk.com"))return"vk";if(h.includes("t.me")||h.includes("telegram"))return"telegram";if(h.includes("ozon"))return"ozon";if(h===window.location.hostname)return"direct";return h.replace(/^www\./,"");}catch{return"other";}}
function newMeta():SessionMeta{const p=new URLSearchParams(window.location.search);const ref=document.referrer||null;return{landingPath:window.location.pathname+window.location.search,referrer:ref,source:p.get("utm_source")?.trim().toLowerCase()||sourceFromReferrer(ref||""),medium:p.get("utm_medium"),campaign:p.get("utm_campaign"),content:p.get("utm_content"),term:p.get("utm_term"),deviceType:deviceType()};}
export function getAnalyticsSessionId(){let visitor=localStorage.getItem(VISITOR_KEY);if(!visitor){visitor=uuid();localStorage.setItem(VISITOR_KEY,visitor);}const now=Date.now();const last=Number(sessionStorage.getItem(SESSION_LAST_KEY)||0);let session=sessionStorage.getItem(SESSION_KEY);if(!session||!last||now-last>SESSION_TIMEOUT){session=uuid();sessionStorage.setItem(SESSION_KEY,session);sessionStorage.setItem(SESSION_META_KEY,JSON.stringify(newMeta()));}sessionStorage.setItem(SESSION_LAST_KEY,String(now));return session;}
function visitorId(){getAnalyticsSessionId();return localStorage.getItem(VISITOR_KEY)!;}
function meta():SessionMeta{getAnalyticsSessionId();try{return JSON.parse(sessionStorage.getItem(SESSION_META_KEY)||"") as SessionMeta;}catch{const m=newMeta();sessionStorage.setItem(SESSION_META_KEY,JSON.stringify(m));return m;}}
export function trackAnalyticsEvent(eventType:EventType,data:{productId?:string;variantId?:string;quantity?:number;path?:string}={}){const key=`${eventType}:${data.productId??""}:${data.variantId??""}:${data.path??window.location.pathname}`;const now=Date.now();if(key===lastEventKey&&now-lastEventAt<1200)return;lastEventKey=key;lastEventAt=now;void apiRequest("/analytics/events",{method:"POST",headers:getAuthHeaders(),body:JSON.stringify({sessionId:getAnalyticsSessionId(),visitorId:visitorId(),eventType,productId:data.productId??null,variantId:data.variantId??null,quantity:data.quantity??null,path:data.path??window.location.pathname,session:meta()})}).catch(()=>{ /* аналитика не должна мешать магазину */ });}
