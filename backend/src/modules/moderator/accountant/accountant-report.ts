import type { Request, Response } from "express";
import { prisma } from "../../../database/prisma.js";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function period(req: Request) {
  const from = String(req.query.from ?? req.body?.from ?? "");
  const to = String(req.query.to ?? req.body?.to ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error("Укажите даты в формате ГГГГ-ММ-ДД");
  const start = new Date(from + "T00:00:00.000Z");
  const end = new Date(to + "T23:59:59.999Z");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.toISOString().slice(0,10) !== from || end.toISOString().slice(0,10) !== to || start > end || end.getTime()-start.getTime()>366*86400000) throw new Error("Некорректный период (максимум 366 дней)");
  return { from, to, start, end };
}
async function load(req: Request) {
  const range = period(req);
  const payments = await prisma.order_payments.findMany({
    where: { paid_at: { gte:range.start, lte:range.end }, status:"succeeded" },
    include: { orders: { include: { order_items:true, order_discounts:true } } },
    orderBy: { paid_at:"asc" }
  });
  const rows = payments.map(p => ({
    date:p.paid_at?.toISOString() ?? "", number:p.orders.order_number, paymentId:p.operation_number ?? "",
    customer:p.orders.customer_name, amount:Number(p.amount), delivery:Number(p.orders.delivery_cost),
    discount:Number(p.orders.discount_total), loyalty:Number(p.orders.loyalty_spent),
    promo:p.orders.promo_code ?? "", status:p.status,
    items:p.orders.order_items.map(i=>({name:i.product_name,sku:i.sku,qty:i.quantity,price:Number(i.unit_price),total:Number(i.line_total)}))
  }));
  const warnings=[
    "Возвраты не включены: в текущей модели нет подтверждённого реестра операций возврата.",
    "Комиссии и перечисления ЮKassa не рассчитаны: необходим реестр провайдера.",
    "Даты операций указаны в UTC. При сверке учитывайте часовой пояс.",
    "Это финансовая ведомость, а не КУДиР или банковская выписка."
  ];
  return {range,rows,summary:{count:rows.length,paid:Math.round(rows.reduce((s,r)=>s+r.amount,0)*100)/100},warnings};
}
type Report=Awaited<ReturnType<typeof load>>;
async function workbook(data:Report) {
  const book=new ExcelJS.Workbook();book.creator="TeaMarketV2";
  const summary=book.addWorksheet("Сводка");
  summary.addRows([["Отчёт для бухгалтера"],["Период",data.range.from+" — "+data.range.to],["Оплаченных операций",data.summary.count],["Сумма оплат, ₽",data.summary.paid],[],["Ограничения данных"],...data.warnings.map(w=>[w])]);
  const ops=book.addWorksheet("Операции");
  ops.addRow(["Дата оплаты UTC","Номер заказа","ID платежа","Покупатель","Оплата, ₽","Доставка, ₽","Скидки, ₽","Бонусы, ₽","Промокод","Статус"]);
  data.rows.forEach(r=>ops.addRow([r.date,r.number,r.paymentId,r.customer,r.amount,r.delivery,r.discount,r.loyalty,r.promo,r.status]));
  const items=book.addWorksheet("Расшифровка заказов");
  items.addRow(["Номер заказа","Товар","Артикул","Количество","Цена, ₽","Сумма, ₽"]);
  data.rows.forEach(r=>r.items.forEach(i=>items.addRow([r.number,i.name,i.sku,i.qty,i.price,i.total])));
  const reconciliation=book.addWorksheet("Сверка ЮKassa");
  reconciliation.addRow(["Номер заказа","ID платежа","Дата UTC","Сумма оплаты, ₽","Комиссия ЮKassa","Перечислено","Примечание"]);
  data.rows.forEach(r=>reconciliation.addRow([r.number,r.paymentId,r.date,r.amount,"Нет данных","Нет данных","Необходим реестр ЮKassa"]));
  for (const sheet of book.worksheets) {sheet.getRow(1).font={bold:true};sheet.views=[{state:"frozen",ySplit:1}];sheet.columns.forEach(c=>{c.width=24});}
  return Buffer.from(await book.xlsx.writeBuffer());
}
function fail(res:Response,e:unknown) {
  const message=e instanceof Error?e.message:"Ошибка формирования отчёта";
  res.status(/период|даты|ГГГГ/.test(message)?400:500).json({error:{message}});
}
export async function previewAccountantReport(req:Request,res:Response) {try {res.json({data:await load(req)})}catch(e){fail(res,e)}}
export async function downloadAccountantReport(req:Request,res:Response) {
  try {const data=await load(req);const file=await workbook(data);
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="accountant-'+data.range.from+'-'+data.range.to+'.xlsx"');
    res.send(file);
  } catch(e){fail(res,e)}
}
export async function sendAccountantReport(req:Request,res:Response) {
  try {
    const recipient=String(req.body?.email??"").trim();
    if(!emailPattern.test(recipient)||recipient.length>320){res.status(400).json({error:{message:"Некорректный email"}});return}
    const data=await load(req);const file=await workbook(data);
    const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASSWORD,from=process.env.MAIL_FROM;
    if(!host||!user||!pass||!from)throw new Error("SMTP не настроен");
    const port=Number(process.env.SMTP_PORT||587);
    const transport=nodemailer.createTransport({host,port,secure:port===465,requireTLS:port!==465,auth:{user,pass}});
    await transport.sendMail({from,to:recipient,subject:"Отчёт TeaMarketV2 "+data.range.from+" — "+data.range.to,
      text:"Отчёт во вложении.\n"+data.warnings.join("\n"),
      attachments:[{filename:"accountant-"+data.range.from+"-"+data.range.to+".xlsx",content:file}]});
    res.json({data:{sent:true,email:recipient}});
  }catch(e){fail(res,e)}
}
