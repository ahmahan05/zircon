export interface VoiceCatalogItem {
  id: string;
  name: string;
  defaultPrice?: number;
  isActive?: boolean;
}

export interface VoiceCatalog {
  doctors: VoiceCatalogItem[];
  workTypes: VoiceCatalogItem[];
  colors: VoiceCatalogItem[];
}

export interface VoiceWorkItem {
  workTypeId: string;
  quantity: number;
  unitPrice: number;
}

export interface VoiceDraft {
  transcript: string;
  orderNumber?: string;
  doctorId?: string;
  doctorName?: string;
  patientName?: string;
  colorId?: string;
  items: VoiceWorkItem[];
  notes?: string;
  filled: string[];
}

const RU_INT: Array<[string, number]> = [
  ["двадцать", 20],
  ["девятнадцать", 19],
  ["восемнадцать", 18],
  ["семнадцать", 17],
  ["шестнадцать", 16],
  ["пятнадцать", 15],
  ["четырнадцать", 14],
  ["тринадцать", 13],
  ["двенадцать", 12],
  ["одиннадцать", 11],
  ["десять", 10],
  ["девять", 9],
  ["восемь", 8],
  ["семь", 7],
  ["шесть", 6],
  ["пять", 5],
  ["четыре", 4],
  ["три", 3],
  ["две", 2],
  ["два", 2],
  ["одну", 1],
  ["одна", 1],
  ["одно", 1],
  ["один", 1],
];

const STOP = new Set([
  "наряд",
  "номер",
  "врач",
  "врача",
  "врачу",
  "доктор",
  "доктора",
  "доктору",
  "пациент",
  "пациента",
  "пациенту",
  "пациентка",
  "цвет",
  "цвета",
  "оттенок",
  "штука",
  "штуки",
  "штук",
  "единица",
  "единицы",
  "единиц",
  "коронка",
  "коронки",
  "коронок",
  "работа",
  "работы",
  "и",
  "на",
  "для",
  "по",
  "с",
  "из",
  "в",
  "к",
  "от",
  "без",
  "the",
  "a",
  "an",
  "order",
  "doctor",
  "patient",
  "shade",
  "color",
  "pcs",
  "units",
]);

const LETTER_RU: Record<string, string> = { a: "а", b: "б", c: "ц", d: "д" };

const LETTER_SPOKEN: Record<string, string[]> = {
  a: ["а", "a"],
  b: ["б", "бэ", "b"],
  c: ["ц", "цэ", "c"],
  d: ["д", "дэ", "d"],
};

export function normalizeVoice(raw: string): string {
  return raw
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[«»""„]/g, " ")
    .replace(/№/g, " номер ")
    .replace(/[#]/g, " номер ")
    .replace(/[/\\]+/g, " ")
    .replace(/[,;:!?()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberWord(n: string): string | undefined {
  const map: Record<string, string> = {
    "1": "один",
    "2": "два",
    "3": "три",
    "4": "четыре",
    "5": "пять",
    "6": "шесть",
    "7": "семь",
    "8": "восемь",
    "9": "девять",
    "10": "десять",
  };
  return map[n];
}

export function shadeSpokenForms(name: string): string[] {
  const m = name.trim().match(/^([A-Da-d])\s*(\d(?:[.,]\d)?)$/);
  if (!m) return [normalizeVoice(name)];
  const letter = m[1].toLowerCase();
  const num = m[2].replace(",", ".");
  const [whole, frac] = num.split(".");
  const forms = new Set<string>();
  const letters = LETTER_SPOKEN[letter] ?? [letter, LETTER_RU[letter] ?? letter];
  const wholeWord = numberWord(whole);
  for (const L of letters) {
    forms.add(`${L}${num}`);
    forms.add(`${L} ${num}`);
    forms.add(`${L}${whole}`);
    forms.add(`${L} ${whole}`);
    if (wholeWord) {
      forms.add(`${L} ${wholeWord}`);
      forms.add(`${L}${wholeWord}`);
    }
    if (frac) {
      const fracWord = numberWord(frac);
      forms.add(`${L} ${whole} ${frac}`);
      forms.add(`${L} ${whole}.${frac}`);
      if (wholeWord && fracWord) forms.add(`${L} ${wholeWord} ${fracWord}`);
      if (wholeWord && frac === "5") forms.add(`${L} ${wholeWord} с половиной`);
    }
  }
  forms.add(normalizeVoice(name));
  return [...forms];
}

function workAliases(name: string): string[] {
  const n = normalizeVoice(name);
  const out = new Set<string>([n]);
  if (n.includes("циркон")) {
    out.add(n.replace("циркон", "цирконий"));
    out.add(n.replace("циркон", "zr"));
  }
  if (n.startsWith("п а") || n.startsWith("па ")) {
    const rest = n.replace(/^п а\s+/, "").replace(/^па\s+/, "");
    out.add(`па ${rest}`);
    out.add(`п а ${rest}`);
  }
  if (n.startsWith("мк")) {
    const rest = n.replace(/^мк\s*/, "");
    out.add(`мк ${rest}`);
    out.add(`металлокерамика ${rest}`);
  }
  if (n.includes("временн")) {
    out.add("времянка");
    out.add("временная");
    out.add("временная коронка");
  }
  if (n.includes("трансфер")) {
    out.add("трансфер");
    out.add("трансфер чек");
  }
  if (n.includes("прикус")) {
    out.add("прикус");
    out.add("прикусной");
  }
  if (n === "балка") out.add("bar");
  return [...out].filter((a) => a.length >= 3).sort((a, b) => b.length - a.length);
}

interface Span {
  start: number;
  end: number;
  kind: string;
}

function overlaps(a: Span, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

function findPhrase(haystack: string, needle: string): number {
  if (!needle) return -1;
  const padded = ` ${haystack} `;
  const idx = padded.indexOf(` ${needle} `);
  return idx < 0 ? -1 : idx;
}

function titleName(raw: string): string {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      if (/^[a-zа-я]\.?$/i.test(part)) return `${part.replace(".", "").toUpperCase()}.`;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function isInitial(tok: string): boolean {
  return /^[a-zа-яё]\.?$/i.test(tok);
}

function cutTokens(catalog: VoiceCatalog): Set<string> {
  const cut = new Set(STOP);
  for (const extra of [
    "наряд",
    "номер",
    "цвет",
    "оттенок",
    "цирконий",
    "времянка",
    "временная",
    "трансфер",
    "прикусной",
    "прикус",
    "пациент",
    "врач",
    "доктор",
    "order",
    "doctor",
    "patient",
  ]) {
    cut.add(extra);
  }
  for (const wt of catalog.workTypes) {
    for (const tok of normalizeVoice(wt.name).split(" ")) {
      if (tok.length > 2) cut.add(tok);
    }
  }
  return cut;
}

function nameAfterLabel(
  text: string,
  labels: string[],
  cut: Set<string>,
  kind: string,
): { name: string; span: Span } | undefined {
  for (const label of labels) {
    const idx = findPhrase(text, label);
    if (idx < 0) continue;
    const restOffset = idx + label.length;
    const gap = text.slice(restOffset).match(/^\s*/)?.[0].length ?? 0;
    const afterStart = restOffset + gap;
    const tokens = text.slice(afterStart).split(" ").filter(Boolean);
    const taken: string[] = [];
    for (const tok of tokens) {
      if (cut.has(tok) || /^\d+$/.test(tok) || /^[a-dа-д]\d/i.test(tok)) break;
      if (isInitial(tok)) {
        if (!taken.length) break;
        taken.push(tok);
        if (taken.length >= 4) break;
        continue;
      }
      if (taken.length >= 3) break;
      taken.push(tok);
    }
    if (!taken.length) continue;
    const name = taken.join(" ");
    return {
      name: titleName(name),
      span: { start: afterStart, end: afterStart + name.length, kind },
    };
  }
  return undefined;
}

function extractQuantity(
  text: string,
  around: { start: number; end: number },
): { qty: number; span?: Span } {
  const windowStart = Math.max(0, around.start - 28);
  const windowEnd = Math.min(text.length, around.end + 28);
  const slice = text.slice(windowStart, windowEnd);
  const digit = slice.match(/(?<![a-zа-яё])(\d{1,2})(?!\d)\s*(?:шт|штук|единиц|корон)?/u);
  if (digit?.[1]) {
    const n = Number.parseInt(digit[1], 10);
    if (n >= 1 && n <= 40) {
      const local = digit.index ?? 0;
      return {
        qty: n,
        span: {
          start: windowStart + local,
          end: windowStart + local + digit[1].length,
          kind: "qty",
        },
      };
    }
  }
  for (const [word, n] of RU_INT) {
    const at = findPhrase(slice, word);
    if (at >= 0) {
      return {
        qty: n,
        span: { start: windowStart + at, end: windowStart + at + word.length, kind: "qty" },
      };
    }
  }
  return { qty: 1 };
}

function bestDoctor(
  spoken: string,
  doctors: VoiceCatalogItem[],
): { id: string; name: string } | undefined {
  const q = normalizeVoice(spoken);
  if (!q) return undefined;
  let best: { id: string; name: string; score: number } | undefined;
  for (const doc of doctors) {
    const n = normalizeVoice(doc.name);
    const last = n.split(" ")[0] ?? n;
    let score = 0;
    if (n === q) score = 100;
    else if (last === q) score = 90;
    else if (n.startsWith(q) || q.startsWith(last)) score = 70;
    if (score && (!best || score > best.score)) best = { id: doc.id, name: doc.name, score };
  }
  return best && best.score >= 70 ? { id: best.id, name: best.name } : undefined;
}

function matchUnlabeledDoctor(
  text: string,
  doctors: VoiceCatalogItem[],
  used: Span[],
): { id: string; name: string; span: Span } | undefined {
  let best: { id: string; name: string; score: number; span: Span } | undefined;
  for (const doc of doctors) {
    const last = (normalizeVoice(doc.name).split(" ")[0] ?? "").trim();
    if (last.length < 4) continue;
    const idx = findPhrase(text, last);
    if (idx < 0) continue;
    const span = { start: idx, end: idx + last.length, kind: "doctor" };
    if (used.some((u) => overlaps(u, span))) continue;
    const score = last.length;
    if (!best || score > best.score) best = { id: doc.id, name: doc.name, score, span };
  }
  return best;
}

export function parseVoiceOrder(transcript: string, catalog: VoiceCatalog): VoiceDraft {
  const text = normalizeVoice(transcript);
  const used: Span[] = [];
  const filled: string[] = [];
  const draft: VoiceDraft = { transcript: transcript.trim(), items: [], filled };
  if (!text) return draft;
  const cut = cutTokens(catalog);

  const numberMatch = text.match(/(?:наряд|номер|order)\s+(\d{1,8})/);
  if (numberMatch?.[1] && numberMatch.index != null) {
    draft.orderNumber = numberMatch[1];
    used.push({
      start: numberMatch.index,
      end: numberMatch.index + numberMatch[0].length,
      kind: "number",
    });
    filled.push("orderNumber");
  } else {
    const lonely = [...text.matchAll(/(?:^|\s)(\d{3,6})(?=\s|$)/g)];
    const hit = lonely[0];
    if (hit?.[1] && Number.parseInt(hit[1], 10) >= 100) {
      const start = (hit.index ?? 0) + (hit[0].startsWith(" ") ? 1 : 0);
      draft.orderNumber = hit[1];
      used.push({ start, end: start + hit[1].length, kind: "number" });
      filled.push("orderNumber");
    }
  }

  const activeColors = catalog.colors.filter((c) => c.isActive !== false);
  const colorHits: Array<{ id: string; span: Span; len: number }> = [];
  for (const color of activeColors) {
    for (const form of shadeSpokenForms(color.name)) {
      const idx = findPhrase(text, form);
      if (idx < 0) continue;
      colorHits.push({
        id: color.id,
        span: { start: idx, end: idx + form.length, kind: "color" },
        len: form.length,
      });
    }
  }
  colorHits.sort((a, b) => b.len - a.len);
  const color = colorHits.find((hit) => !used.some((u) => overlaps(u, hit.span)));
  if (color) {
    draft.colorId = color.id;
    used.push(color.span);
    filled.push("color");
  }

  const activeWorks = catalog.workTypes.filter((w) => w.isActive !== false);
  const workHits: Array<{ id: string; price: number; span: Span; len: number }> = [];
  for (const wt of activeWorks) {
    for (const alias of workAliases(wt.name)) {
      const idx = findPhrase(text, alias);
      if (idx < 0) continue;
      workHits.push({
        id: wt.id,
        price: wt.defaultPrice ?? 0,
        span: { start: idx, end: idx + alias.length, kind: "work" },
        len: alias.length,
      });
    }
  }
  workHits.sort((a, b) => b.len - a.len);
  const takenWorks = new Set<string>();
  for (const hit of workHits) {
    if (takenWorks.has(hit.id)) continue;
    if (used.some((u) => overlaps(u, hit.span))) continue;
    const qty = extractQuantity(text, hit.span);
    draft.items.push({ workTypeId: hit.id, quantity: qty.qty, unitPrice: hit.price });
    used.push(hit.span);
    if (qty.span) used.push(qty.span);
    takenWorks.add(hit.id);
  }
  if (draft.items.length) filled.push("works");

  const labeledDoctor = nameAfterLabel(
    text,
    ["врач", "врача", "доктор", "доктора", "doctor"],
    cut,
    "doctor",
  );
  if (labeledDoctor) {
    used.push(labeledDoctor.span);
    const hit = bestDoctor(labeledDoctor.name, catalog.doctors);
    if (hit) {
      draft.doctorId = hit.id;
      draft.doctorName = hit.name;
    } else {
      draft.doctorName = labeledDoctor.name;
    }
    filled.push("doctor");
  } else {
    const unlabeled = matchUnlabeledDoctor(text, catalog.doctors, used);
    if (unlabeled) {
      used.push(unlabeled.span);
      draft.doctorId = unlabeled.id;
      draft.doctorName = unlabeled.name;
      filled.push("doctor");
    }
  }

  const patient = nameAfterLabel(
    text,
    ["пациентка", "пациента", "пациент", "patient"],
    cut,
    "patient",
  );
  if (patient) {
    used.push(patient.span);
    draft.patientName = patient.name;
    filled.push("patient");
  }

  const leftover = leftoverNotes(text, used, cut);
  if (leftover) {
    draft.notes = leftover;
    filled.push("notes");
  }
  return draft;
}

function leftoverNotes(text: string, used: Span[], cut: Set<string>): string | undefined {
  const marks = used.slice().sort((a, b) => a.start - b.start);
  let cursor = 0;
  let rest = "";
  for (const span of marks) {
    if (span.start > cursor) rest += ` ${text.slice(cursor, span.start)}`;
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < text.length) rest += ` ${text.slice(cursor)}`;
  const tokens = normalizeVoice(rest)
    .split(" ")
    .filter((tok) => tok && !cut.has(tok) && !STOP.has(tok) && !/^\d{1,2}$/.test(tok));
  if (tokens.length < 2) return undefined;
  return titleName(tokens.join(" "));
}

export const VOICE_KEYTERMS = [
  "наряд",
  "врач",
  "пациент",
  "цвет",
  "циркон",
  "цирконий",
  "балка",
  "трансферчек",
  "прикусной",
  "времянка",
  "культя",
  "имплант",
  "A1",
  "A2",
  "A3",
  "A3.5",
  "A4",
  "B1",
  "B2",
];
