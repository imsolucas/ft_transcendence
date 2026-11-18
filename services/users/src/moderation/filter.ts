import {
  type MatchPayload,
  DataSet,
  RegExpMatcher,
  TextCensor,
  asteriskCensorStrategy,
  englishDataset,
  englishRecommendedTransformers,
  keepStartCensorStrategy,
  pattern,
} from "obscenity";

/**
 * Offline chat filter (no API, no cost). Profanity and slurs are masked ("f***"), never
 * deleted, so the conversation still reads. Only slurs count as a strike (see strikes.ts):
 * ordinary swearing is masked and forgotten. The English list comes from `obscenity`
 * (leetspeak- and lookalike-aware); Spanish and French are short lists of our own.
 * Matching is accent-insensitive ("cabrón" = "cabron").
 */

type Meta = { originalWord: string; slur?: boolean };

// Words in obscenity's English list that are slurs (aimed at a group), not just swearing.
const ENGLISH_SLURS = new Set([
  "abo", "abeed", "africoon", "arabush", "boonga", "chingchong", "chink", "dyke", "fag",
  "kike", "nigger", "retard", "spastic", "tranny",
]);

const dataset = new DataSet<Meta>()
  .addAll(englishDataset as unknown as DataSet<Meta>)
  // "negro" is the ordinary Spanish word for "black"
  .removePhrasesIf((p) => p.metadata?.originalWord === "negro");

// Spanish and French. Written without accents (the input is folded first) and with doubled
// letters collapsed the way the English transformers do ("connard" is matched as "conard";
// only b, e, o, l, s and g may stay doubled)
const EXTRA: { word: string; slur?: boolean; patterns: ReturnType<typeof pattern>[] }[] = [
  // en: full forms, so the whole word is masked ("f**got" would still read)
  { word: "fag", slur: true, patterns: [pattern`|faggot|`, pattern`|faggots|`, pattern`|fags|`] },
  { word: "retard", slur: true, patterns: [pattern`|retarded|`, pattern`|retards|`] },
  { word: "nigger", slur: true, patterns: [pattern`|niggers|`, pattern`|nigga|`, pattern`|niggas|`] },
  // es
  { word: "puta", patterns: [pattern`|puta|`, pattern`|putas|`, pattern`|puto|`, pattern`|putos|`] },
  { word: "mierda", patterns: [pattern`|mierda|`] },
  { word: "cono", patterns: [pattern`|cono|`] },
  { word: "joder", patterns: [pattern`|joder|`, pattern`|jodete|`] },
  { word: "cabron", patterns: [pattern`|cabron|`, pattern`|cabrona|`, pattern`|cabrones|`] },
  { word: "gilipollas", patterns: [pattern`|gilipollas|`] },
  { word: "pendejo", patterns: [pattern`|pendejo|`, pattern`|pendeja|`, pattern`|pendejos|`] },
  { word: "verga", patterns: [pattern`|verga|`] },
  { word: "culero", patterns: [pattern`|culero|`, pattern`|culera|`] },
  { word: "zorra", patterns: [pattern`|zora|`] },
  { word: "maricon", slur: true, patterns: [pattern`|maricon|`, pattern`|maricones|`] },
  { word: "sudaca", slur: true, patterns: [pattern`|sudaca|`, pattern`|sudacas|`] },
  // fr
  { word: "putain", patterns: [pattern`|putain|`] },
  { word: "pute", patterns: [pattern`|pute|`, pattern`|putes|`] },
  { word: "merde", patterns: [pattern`|merde|`] },
  { word: "connard", patterns: [pattern`|conard|`, pattern`|conards|`, pattern`|conasse|`] },
  { word: "salope", patterns: [pattern`|salope|`, pattern`|salopes|`] },
  { word: "encule", patterns: [pattern`|encule|`, pattern`|enculee|`, pattern`|encules|`] },
  { word: "batard", patterns: [pattern`|batard|`, pattern`|batards|`] },
  { word: "niquer", patterns: [pattern`|nique|`, pattern`|niquer|`, pattern`|ntm|`] },
  { word: "pede", slur: true, patterns: [pattern`|pede|`, pattern`|pedes|`] },
  { word: "bougnoule", slur: true, patterns: [pattern`|bougnoule|`, pattern`|bougnoules|`] },
  { word: "negre", slur: true, patterns: [pattern`|negre|`, pattern`|negres|`, pattern`|negresse|`] },
  { word: "youpin", slur: true, patterns: [pattern`|youpin|`, pattern`|youpins|`] },
];
// harmless words the English list would otherwise catch ("fagioli" = beans)
dataset.addPhrase((p) => p.setMetadata({ originalWord: "whitelist" }).addWhitelistedTerm("fagiol"));
for (const e of EXTRA) {
  dataset.addPhrase((p) => {
    let phrase = p.setMetadata({ originalWord: e.word, slur: e.slur });
    for (const pat of e.patterns) phrase = phrase.addPattern(pat);
    return phrase;
  });
}

const matcher = new RegExpMatcher({ ...dataset.build(), ...englishRecommendedTransformers });
const censor = new TextCensor().setStrategy(keepStartCensorStrategy(asteriskCensorStrategy()));

/** Strips accents one code point at a time, so every index in the result matches the input. */
function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const base = ch.normalize("NFD")[0] ?? ch;
    out += base.length === ch.length ? base : ch;
  }
  return out;
}

export interface FilterResult {
  /** the text to store and deliver (masked where needed) */
  text: string;
  masked: boolean;
  /** at least one slur: this message is a strike */
  slur: boolean;
}

export function filterChat(text: string): FilterResult {
  const matches = matcher.getAllMatches(fold(text), true);
  if (matches.length === 0) return { text, masked: false, slur: false };
  const slur = matches.some((m) => {
    const meta = dataset.getPayloadWithPhraseMetadata(m).phraseMetadata;
    return !!meta && (meta.slur === true || ENGLISH_SLURS.has(meta.originalWord));
  });
  return { text: censor.applyTo(text, mergeOverlaps(matches)), masked: true, slur };
}

/** The censor expects separate matches; overlapping ones ("retard" in "retarded") are merged. */
function mergeOverlaps(matches: MatchPayload[]): MatchPayload[] {
  const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);
  const out: MatchPayload[] = [];
  for (const m of sorted) {
    const last = out[out.length - 1];
    if (last && m.startIndex <= last.endIndex) {
      if (m.endIndex > last.endIndex) {
        out[out.length - 1] = { ...last, endIndex: m.endIndex, matchLength: m.endIndex - last.startIndex + 1 };
      }
    } else out.push(m);
  }
  return out;
}

// http(s) links, www. links and bare domains with a common TLD ("free-skins.gg/xyz")
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|gg|xyz|ru|cn|tk|ly|link|app|dev|info|biz|shop|site|top|click)\b(?:\/\S*)?/i;

export function hasLink(text: string): boolean {
  return LINK.test(fold(text));
}
