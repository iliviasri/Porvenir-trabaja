/**
 * Control básico de ofertas engañosas, discriminatorias o con indicios de relación laboral irregular.
 * `blocked`: se rechaza al enviar. `warnings`: el moderador las ve y decide.
 */
export interface OfferSafetyResult { blocked: string[]; warnings: string[] }

interface Rule { re: RegExp; msg: string; appliesTo?: string[] }

const BLOCK: Rule[] = [
  { re: /(pago|cobro|cobramos|dep[oó]sito|cuota)\s+(de|por|para)?\s*(inscripci[oó]n|ingreso|capacitaci[oó]n|materiales|uniforme|garant[ií]a|kit)/i,
    msg: "No se permiten ofertas que pidan pagos o depósitos al postulante." },
  { re: /(debes|tienes que|deber[aá]s)\s+(pagar|depositar)/i, msg: "No se permiten ofertas que pidan pagos o depósitos al postulante." },
  { re: /(ganancias?|ingresos?)\s+(garantizad[oa]s?|aseguradas?)|dinero\s+f[aá]cil|gana\s+(s\/|soles)?\s*\d+.{0,30}(sin esfuerzo|desde casa sin)/i,
    msg: "No se permiten promesas de ganancias garantizadas o «dinero fácil»." },
  { re: /multinivel|pir[aá]mide|red de mercadeo/i, msg: "No se permiten esquemas multinivel o de pirámide." },
  { re: /clave\s*sol|clave\s*bancaria|n[uú]mero de tarjeta|c[oó]digo de seguridad|foto de (tu )?dni/i,
    msg: "No pidas claves, datos bancarios ni fotos del DNI en la oferta." },
  { re: /\b(solo|[uú]nicamente|exclusivo)\s+(para\s+)?(mujeres|varones|hombres|damas|se[ñn]oritas)\b|buena presencia|menor(es)? de \d{2} a[ñn]os|edad (m[aá]xima|l[ií]mite)/i,
    msg: "La oferta contiene criterios discriminatorios (sexo, edad, apariencia). La normativa peruana prohíbe requisitos de ese tipo salvo justificación objetiva." },
  { re: /sin contrato|sin planilla|\ben negro\b/i, msg: "No se permiten ofertas de empleo dependiente «sin contrato» o «sin planilla».", appliesTo: ["empleo_dependiente"] },
];

const WARN: Rule[] = [
  { re: /(solo|[uú]nicamente)\s+comisi[oó]n|comisiones? [uú]nicamente|sin sueldo fijo/i, msg: "La remuneración parece ser solo por comisión; verifica que no encubra una relación laboral irregular." },
  { re: /recibo(s)? por honorarios/i, msg: "Menciona recibos por honorarios; verifica que no se trate de un empleo dependiente encubierto.", appliesTo: ["empleo_dependiente"] },
  { re: /whatsapp.{0,40}(env[ií]a|enviar)|env[ií]a tu cv por whatsapp/i, msg: "La oferta pide enviar documentos por WhatsApp; la postulación debe hacerse por la plataforma." },
  { re: /por d[ií]a.{0,20}s\/\s*\d{3,}/i, msg: "Pago diario elevado: revisar que sea realista." },
];

export function checkOfferContent(input: { title: string; description: string; offer_type: string; schedule_text?: string }): OfferSafetyResult {
  const text = `${input.title}\n${input.description}\n${input.schedule_text ?? ""}`;
  const run = (rules: Rule[]) => [
    ...new Set(rules.filter((r) => (!r.appliesTo || r.appliesTo.includes(input.offer_type)) && r.re.test(text)).map((r) => r.msg)),
  ];
  return { blocked: run(BLOCK), warnings: run(WARN) };
}
