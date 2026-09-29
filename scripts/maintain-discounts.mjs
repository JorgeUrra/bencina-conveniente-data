import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fileArg = process.argv.find(arg => arg.startsWith('--file='));
const path = fileArg ? fileArg.slice('--file='.length) : new URL('../data/descuentos.json', import.meta.url);
const prune = process.argv.includes('--prune');
const payload = JSON.parse(readFileSync(path, 'utf8'));
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(new Date());
const part = (type) => parts.find(p => p.type === type)?.value;
const dateArg = process.argv.find(arg => arg.startsWith('--date='));
const today = dateArg ? dateArg.slice('--date='.length) : `${part('year')}-${part('month')}-${part('day')}`;
const officialHosts = new Set([
  'ww2.copec.cl', 'www.copec.cl', 'copec.cl',
  'www.aramcoestaciones.cl', 'aramcoestaciones.cl',
  'goplus.shell.cl', 'www.shell.cl', 'shell.cl', 'www.enex.cl', 'enex.cl',
]);
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !Number.isNaN(Date.parse(`${s}T12:00:00Z`))
  && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
if (!isDate(today)) throw Error('Fecha de referencia inválida');
const expired = (d) => d.revisarHasta < today || (d.vigenteHasta && d.vigenteHasta < today);

if (!Array.isArray(payload.descuentos)) throw Error('descuentos debe ser una lista');
const ids = new Set();
for (const d of payload.descuentos) {
  if (!d || typeof d.id !== 'string' || ids.has(d.id)) throw Error(`ID inválido o duplicado: ${d?.id}`);
  ids.add(d.id);
  if (!['Copec', 'Shell', 'Aramco'].includes(d.cadena)) throw Error(`${d.id}: cadena inválida`);
  if (!['descuento', 'descuento_surtidor', 'cashback', 'puntos'].includes(d.tipo)) throw Error(`${d.id}: tipo inválido`);
  if (!Array.isArray(d.dias) || !d.dias.length || d.dias.some(v => !['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'todos'].includes(v))) throw Error(`${d.id}: días inválidos`);
  if (typeof d.montoTexto !== 'string' || !d.montoTexto || !Number.isFinite(d.montoMaxCLP) || d.montoMaxCLP <= 0) throw Error(`${d.id}: monto inválido`);
  if (!isDate(d.verificadoEl) || !isDate(d.revisarHasta) || (d.vigenteHasta && !isDate(d.vigenteHasta))) throw Error(`${d.id}: fecha inválida`);
  if (d.verificadoEl > d.revisarHasta || d.verificadoEl > today) throw Error(`${d.id}: revisión incoherente`);
  if (d.vigenteHasta && d.vigenteHasta < d.verificadoEl) throw Error(`${d.id}: oferta vencida al verificar`);
  let url;
  try { url = new URL(d.fuenteUrl); } catch { throw Error(`${d.id}: falta fuente oficial`); }
  if (url.protocol !== 'https:' || !officialHosts.has(url.hostname)) throw Error(`${d.id}: fuente no oficial`);
}

const oldCount = payload.descuentos.length;
if (prune) {
  payload.descuentos = payload.descuentos.filter(d => !expired(d));
  if (payload.descuentos.length !== oldCount) {
    payload.generatedAt = new Date().toISOString();
    payload.vigencia = today.slice(0, 7);
    payload.hash = createHash('sha256').update(JSON.stringify(payload.descuentos)).digest('hex');
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
}
const stale = payload.descuentos.filter(expired);
if (stale.length) throw Error(`${stale.length} ofertas vencidas o pendientes de revisión: ${stale.map(d => d.id).join(', ')}`);
console.log(`${payload.descuentos.length} ofertas verificadas; ${oldCount - payload.descuentos.length} retiradas; fecha Chile ${today}`);
