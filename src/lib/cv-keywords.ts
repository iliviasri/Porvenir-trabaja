/**
 * Extracción por palabras clave (SIN IA). Se usa cuando no hay modelo de lenguaje configurado y se
 * etiqueta como tal en la interfaz. Solo propone habilidades del catálogo y la duración mencionada.
 */
const SKILL_PATTERNS: Record<string, RegExp> = {
  "Aparado de calzado": /\bapar(ado|ar|ando|ador|adora)\b/i,
  "Corte de cuero": /\bcort(e|ar|ando|ador|ado)\b.{0,15}\b(cuero|piel)\b|\b(cuero|piel)\b.{0,15}\bcort/i,
  "Pegado de suelas": /\bpeg(ado|ar|ando|ador)\b.{0,15}\bsuela/i,
  "Armado de calzado": /\barm(ado|ar|ando|ador)\b.{0,20}\b(zapato|calzado|zapatilla)/i,
  "Acabado de calzado": /\bacabado\b.{0,15}\b(zapato|calzado)/i,
  "Costura industrial": /\b(cos(tura|er|iendo|ido)|remalladora|recta industrial)\b/i,
  "Corte de tela": /\bcort(e|ar|ando)\b.{0,15}\btela/i,
  "Patronaje": /\bpatron(aje|ista)\b/i,
  "Atención al cliente": /\batenci[oó]n al cliente|atend(er|iendo|ía)\b.{0,20}\bclientes?\b/i,
  "Ventas": /\bvend(er|iendo|ía|edor|edora)\b|\bventas?\b/i,
  "Manejo de caja": /\b(manejo de caja|cajer[oa]|cobr(ar|ando)\b)/i,
  "Cocina": /\bcocin(a|ar|ando|ero|era)\b/i,
  "Repostería": /\breposter[ií]a|pastel(ero|era|es)\b/i,
  "Atención en mesa": /\b(mozo|moza|mesero|mesera|atenci[oó]n en mesa)\b/i,
  "Manejo de almacén": /\balmac[eé]n\b/i,
  "Control de inventario": /\binventario\b/i,
  "Empaque y despacho": /\bempaque|empaquet|despach/i,
  "Conducción de vehículos": /\b(conduc(ir|ción|iendo)|chofer|conductor|manej(o|ar|ando) (moto|cami[oó]n|carro|veh[ií]culo|taxi))\b/i,
  "Reparto y distribución": /\brepart(o|ir|ido|idor)\b|\bdelivery\b|\bdistribuci[oó]n\b/i,
  "Limpieza": /\blimpie(za|ar|ando)\b/i,
  "Carpintería": /\bcarpinter/i,
  "Soldadura": /\bsold(ar|adura|ador)\b/i,
};

const NUMBER_WORDS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

export function detectMonths(text: string): number {
  let months = 0;
  const re = /(\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+(a[ñn]os?|meses|mes)\b/gi;
  let m: RegExpExecArray | null;
  const found: number[] = [];
  while ((m = re.exec(text))) {
    const n = /^\d/.test(m[1]!) ? Number(m[1]) : NUMBER_WORDS[m[1]!.toLowerCase()] ?? 0;
    found.push(/^a[ñn]o/i.test(m[2]!) ? n * 12 : n);
  }
  if (found.length) months = Math.max(...found);
  return Math.min(months, 720);
}

export function extractKeywords(text: string) {
  const skills = Object.entries(SKILL_PATTERNS).filter(([, re]) => re.test(text)).map(([name]) => name);
  return { skills, months: detectMonths(text) };
}
