export interface PosLabel {
  label: string;
  description: string;
}

const posLabels: Record<string, PosLabel> = {
  APPGE: {
    label: "Possessive determiner",
    description:
      "Possessive determiner before a noun, e.g. my, your, his, her, their.",
  },
  AT: {
    label: "Article",
    description: "Article neutral for number, e.g. the, no.",
  },
  AT1: {
    label: "Singular article",
    description: "Singular article, e.g. a, an, every.",
  },
  BCL: {
    label: "Before-conjunction tag",
    description:
      "Tag associated with an expression preceding a conjunction. Check the full tagged context for the specific use.",
  },
  BTO: {
    label: "Before-infinitive tag",
    description:
      "Tag associated with an expression preceding an infinitive marker.",
  },
  CC: {
    label: "Coordinating conjunction",
    description: "Joins words, phrases or clauses, e.g. and, or.",
  },
  CCB: {
    label: "But conjunction",
    description: "Coordinating conjunction but.",
  },
  CS: {
    label: "Subordinating conjunction",
    description:
      "Introduces a subordinate clause, e.g. if, when, because, while.",
  },
  CSA: {
    label: "As conjunction",
    description: "As used as a conjunction.",
  },
  CSN: {
    label: "Than conjunction",
    description: "Than used as a conjunction.",
  },
  CST: {
    label: "That conjunction",
    description:
      "That introducing a clause, including nominal or relative clauses.",
  },
  CSW: {
    label: "Whether conjunction",
    description: "Whether, or if when equivalent to whether.",
  },
  DA: {
    label: "Postdeterminer",
    description:
      "After-determiner neutral for number, e.g. such, former, same.",
  },
  DA1: {
    label: "Singular postdeterminer",
    description: "Singular after-determiner, e.g. little, much.",
  },
  DA2: {
    label: "Plural postdeterminer",
    description: "Plural after-determiner, e.g. few, many, several.",
  },
  DAR: {
    label: "Comparative postdeterminer",
    description:
      "Comparative after-determiner, neutral for number, e.g. more, less.",
  },
  DAT: {
    label: "Superlative postdeterminer",
    description: "Superlative after-determiner, e.g. most, least.",
  },
  DB: {
    label: "Predeterminer",
    description: "Before-determiner neutral for number, e.g. all, half.",
  },
  DB2: {
    label: "Plural predeterminer",
    description: "Plural before-determiner, e.g. both.",
  },
  DD: {
    label: "Determiner",
    description:
      "Central determiner neutral for number, e.g. some, any, enough.",
  },
  DD1: {
    label: "Singular determiner",
    description: "Singular central determiner, e.g. this, that, another.",
  },
  DD2: {
    label: "Plural determiner",
    description: "Plural central determiner, e.g. these, those.",
  },
  DDQ: {
    label: "Wh-determiner",
    description: "Interrogative or relative determiner, e.g. which, what.",
  },
  DDQGE: {
    label: "Possessive wh-determiner",
    description: "Possessive wh-determiner, e.g. whose.",
  },
  DDQV: {
    label: "Wh-ever determiner",
    description: "Wh-ever determiner, e.g. whichever, whatever.",
  },
  EX: {
    label: "Existential there",
    description:
      "There used in existential constructions, e.g. there is a problem.",
  },
  IF: {
    label: "For preposition",
    description: "For functioning as a preposition.",
  },
  II: {
    label: "Preposition",
    description: "General preposition, e.g. at, by, in, to.",
  },
  IO: {
    label: "Of preposition",
    description: "Of functioning as a preposition.",
  },
  IW: {
    label: "With/without preposition",
    description: "With or without functioning as a preposition.",
  },
  JJ: {
    label: "Adjective",
    description:
      "General or positive-form adjective, e.g. good, old, beautiful.",
  },
  JJR: {
    label: "Comparative adjective",
    description: "Comparative adjective, e.g. better, older.",
  },
  JJT: {
    label: "Superlative adjective",
    description: "Superlative adjective, e.g. best, oldest.",
  },
  JK: {
    label: "Catenative adjective",
    description:
      "Adjective with a quasi-auxiliary function, e.g. able in be able to.",
  },
  MC: {
    label: "Cardinal number",
    description: "Cardinal number neutral for number, e.g. two, three, 98.",
  },
  MC1: {
    label: "Singular cardinal number",
    description: "Singular cardinal number, e.g. one, 1.",
  },
  MC2: {
    label: "Plural cardinal number",
    description: "Plural cardinal number, e.g. tens, twenties.",
  },
  MD: {
    label: "Ordinal number",
    description: "Ordinal number, e.g. first, sixth, 77th, last.",
  },
  MF: {
    label: "Fractional number",
    description:
      "Fractional number neutral for number, e.g. quarter, two-thirds.",
  },
  ND1: {
    label: "Singular direction noun",
    description: "Singular noun of direction, e.g. north, east.",
  },
  NN: {
    label: "Number-neutral noun",
    description: "Common noun neutral for number, e.g. sheep, aircraft, group.",
  },
  NN1: {
    label: "Singular noun",
    description: "Singular common noun, e.g. book, house, idea.",
  },
  NN2: {
    label: "Plural noun",
    description: "Plural common noun, e.g. books, houses, ideas.",
  },
  NNB: {
    label: "Title noun",
    description:
      "Noun of style or title occurring before a name; verify against the corpus tag documentation.",
  },
  NNL: {
    label: "Locative noun",
    description: "Locative noun neutral for number.",
  },
  NNL1: {
    label: "Singular locative noun",
    description: "Singular locative noun, e.g. island, street.",
  },
  NNL2: {
    label: "Plural locative noun",
    description: "Plural locative noun, e.g. islands, streets.",
  },
  NNO: {
    label: "Numeral noun",
    description:
      "Numeral noun neutral for number, e.g. hundred, thousand, dozen.",
  },
  NNO2: {
    label: "Plural numeral noun",
    description: "Plural numeral noun, e.g. hundreds, thousands, dozens.",
  },
  NNT1: {
    label: "Singular time noun",
    description: "Singular temporal noun, e.g. day, week, year.",
  },
  NNT2: {
    label: "Plural time noun",
    description: "Plural temporal noun, e.g. days, weeks, years.",
  },
  NNU: {
    label: "Measurement noun",
    description: "Unit-of-measurement noun neutral for number.",
  },
  NNU1: {
    label: "Singular measurement noun",
    description: "Singular unit-of-measurement noun, e.g. inch, litre.",
  },
  NNU2: {
    label: "Plural measurement noun",
    description: "Plural unit-of-measurement noun, e.g. inches, litres.",
  },
  NP: {
    label: "Proper noun",
    description:
      "Proper noun neutral for number, e.g. an acronym or a component of a place name.",
  },
  NP1: {
    label: "Singular proper noun",
    description: "Singular proper noun, e.g. Vivian, Clinton, Mexico.",
  },
  NP2: {
    label: "Plural proper noun",
    description: "Plural proper noun, e.g. Kennedys, Pyrenees.",
  },
  NPD1: {
    label: "Singular weekday noun",
    description: "Singular weekday noun, e.g. Saturday, Wednesday.",
  },
  NPD2: {
    label: "Plural weekday noun",
    description: "Plural weekday noun, e.g. Sundays, Fridays.",
  },
  NPM1: {
    label: "Singular month noun",
    description: "Singular month name used as a noun.",
  },
  NPM2: {
    label: "Plural month noun",
    description: "Plural month name used as a noun.",
  },
  PN: {
    label: "Indefinite pronoun",
    description: "Indefinite pronoun neutral for number.",
  },
  PN1: {
    label: "Singular indefinite pronoun",
    description:
      "Singular indefinite pronoun, e.g. someone, everything, no one.",
  },
  PNQO: {
    label: "Objective wh-pronoun",
    description: "Wh-pronoun in objective case, e.g. whom.",
  },
  PNQS: {
    label: "Subjective wh-pronoun",
    description: "Wh-pronoun in subjective case, e.g. who.",
  },
  PNQV: {
    label: "Wh-ever pronoun",
    description:
      "Wh-ever pronoun; consult the specific tag documentation for its subtype.",
  },
  PNX1: {
    label: "Singular reflexive pronoun",
    description: "Singular reflexive indefinite pronoun, e.g. oneself.",
  },
  PPGE: {
    label: "Possessive pronoun",
    description:
      "Possessive form; consult the corpus documentation for its exact subtype.",
  },
  PPH1: {
    label: "Third-person singular pronoun",
    description: "Third-person singular personal pronoun, e.g. it.",
  },
  PPHO1: {
    label: "Singular objective pronoun",
    description: "Third-person singular objective pronoun, e.g. him, her.",
  },
  PPHO2: {
    label: "Plural objective pronoun",
    description: "Third-person plural objective pronoun, e.g. them.",
  },
  PPHS1: {
    label: "Singular subject pronoun",
    description: "Third-person singular subjective pronoun, e.g. he, she.",
  },
  PPHS2: {
    label: "Plural subject pronoun",
    description: "Third-person plural subjective pronoun, e.g. they.",
  },
  PPIO1: {
    label: "First-person singular object",
    description: "First-person singular objective pronoun, e.g. me.",
  },
  PPIO2: {
    label: "First-person plural object",
    description: "First-person plural objective pronoun, e.g. us.",
  },
  PPIS1: {
    label: "First-person singular subject",
    description: "First-person singular subjective pronoun, e.g. I.",
  },
  PPIS2: {
    label: "First-person plural subject",
    description: "First-person plural subjective pronoun, e.g. we.",
  },
  PPX1: {
    label: "Singular reflexive pronoun",
    description: "Singular reflexive pronoun, e.g. myself, yourself, herself.",
  },
  PPX2: {
    label: "Plural reflexive pronoun",
    description:
      "Plural reflexive pronoun, e.g. ourselves, yourselves, themselves.",
  },
  PPY: {
    label: "Second-person pronoun",
    description: "Second-person personal pronoun, e.g. you.",
  },
  RA: {
    label: "Post-nominal adverb",
    description: "Adverb following a nominal head, e.g. else, galore.",
  },
  REX: {
    label: "Appositional adverb",
    description:
      "Adverb introducing an appositional construction, e.g. i.e., e.g.",
  },
  RG: {
    label: "Degree adverb",
    description: "Positive-degree adverb, e.g. very, so, too.",
  },
  RGQ: {
    label: "Wh-degree adverb",
    description: "Wh-adverb modifying a gradable expression, e.g. how.",
  },
  RGQV: {
    label: "Wh-ever degree adverb",
    description: "Wh-ever degree adverb, e.g. however.",
  },
  RGR: {
    label: "Comparative degree adverb",
    description: "Comparative degree adverb, e.g. more, less.",
  },
  RGT: {
    label: "Superlative degree adverb",
    description: "Superlative degree adverb, e.g. most, least.",
  },
  RL: {
    label: "Locative adverb",
    description:
      "Adverb expressing location or direction, e.g. forward, alongside, there.",
  },
  RP: {
    label: "Adverbial particle",
    description: "Adverbial particle, e.g. up, out, in.",
  },
  RPK: {
    label: "Catenative particle",
    description: "Catenative adverbial particle, e.g. about in be about to.",
  },
  RR: {
    label: "General adverb",
    description: "General positive-form adverb, e.g. often, well, easily.",
  },
  RRQ: {
    label: "Wh-adverb",
    description: "General wh-adverb, e.g. how, when, where, why.",
  },
  RRQV: {
    label: "Wh-ever adverb",
    description: "Wh-ever general adverb, e.g. however, whenever, wherever.",
  },
  RRR: {
    label: "Comparative adverb",
    description: "Comparative general adverb, e.g. more, longer, further.",
  },
  RRT: {
    label: "Superlative adverb",
    description: "Superlative general adverb, e.g. most, longest, furthest.",
  },
  RT: {
    label: "Time adverb",
    description: "Nominal adverb of time, e.g. now, tomorrow, yesterday.",
  },
  TO: {
    label: "Infinitive marker",
    description: "To introducing an infinitive, e.g. to go.",
  },
  UH: {
    label: "Interjection",
    description: "Interjection or other isolate, e.g. oh, yes, wow.",
  },
  VB0: {
    label: "Finite be",
    description: "Finite base form of be.",
  },
  VBDR: {
    label: "Were",
    description: "Past-tense form were.",
  },
  VBDZ: {
    label: "Was",
    description: "Past-tense form was.",
  },
  VBG: {
    label: "Be -ing form",
    description: "The -ing form of be: being.",
  },
  VBI: {
    label: "Be infinitive",
    description: "Infinitive form of be.",
  },
  VBM: {
    label: "Am",
    description: "First-person singular present form of be: am, 'm.",
  },
  VBN: {
    label: "Be past participle",
    description: "Past participle of be: been.",
  },
  VBR: {
    label: "Are",
    description: "Present-tense form are, including 're.",
  },
  VBZ: {
    label: "Is",
    description: "Third-person singular form of be: is, 's.",
  },
  VD0: {
    label: "Finite do",
    description: "Finite base form of do.",
  },
  VDD: {
    label: "Did",
    description: "Past-tense form of do: did.",
  },
  VDG: {
    label: "Do -ing form",
    description: "The -ing form of do: doing.",
  },
  VDI: {
    label: "Do infinitive",
    description: "Infinitive form of do.",
  },
  VDN: {
    label: "Do past participle",
    description: "Past participle of do: done.",
  },
  VDZ: {
    label: "Does",
    description: "Third-person singular form of do: does.",
  },
  VH0: {
    label: "Finite have",
    description: "Finite base form of have, including have and 've.",
  },
  VHD: {
    label: "Had",
    description: "Past-tense form of have: had, 'd.",
  },
  VHG: {
    label: "Have -ing form",
    description: "The -ing form of have: having.",
  },
  VHI: {
    label: "Have infinitive",
    description: "Infinitive form of have.",
  },
  VHN: {
    label: "Have past participle",
    description: "Past participle of have: had.",
  },
  VHZ: {
    label: "Has",
    description: "Third-person singular form of have: has, 's.",
  },
  VM: {
    label: "Modal verb",
    description: "Modal auxiliary verb, e.g. can, could, will, would, might.",
  },
  VV0: {
    label: "Base-form verb",
    description: "Finite base form of a lexical verb, e.g. give, work, go.",
  },
  VVD: {
    label: "Past-tense verb",
    description: "Past-tense form of a lexical verb, e.g. gave, worked, went.",
  },
  VVG: {
    label: "Verb -ing form",
    description: "The -ing form of a lexical verb, e.g. giving, working.",
  },
  VVGK: {
    label: "Special -ing verb form",
    description:
      "Specialised lexical verb -ing tag; check its local corpus context.",
  },
  VVI: {
    label: "Verb infinitive",
    description: "Infinitive form of a lexical verb, e.g. to give, to work.",
  },
  VVN: {
    label: "Past participle verb",
    description: "Past participle of a lexical verb, e.g. given, worked.",
  },
  VVNK: {
    label: "Special past participle",
    description:
      "Specialised past-participle tag; check its local corpus context.",
  },
  VVZ: {
    label: "Third-person verb",
    description:
      "Third-person singular present form of a lexical verb, e.g. gives, works.",
  },
  XX: {
    label: "Negative particle",
    description: "Negative particle, e.g. not, n't.",
  },
  FO: {
    label: "Formulaic item",
    description:
      "Formulaic or specialised unclassified item; check the source annotation.",
  },
  FU: {
    label: "Unclassified item",
    description: "Item not classified as an ordinary English lexical item.",
  },
  FW: {
    label: "Foreign word",
    description: "Foreign-language word or expression.",
  },
  GE: {
    label: "Genitive marker",
    description:
      "Genitive or possessive marker; inspect the tagged token and context.",
  },
  ZZ1: {
    label: "Singular letter/symbol",
    description: "Alphabetical symbol or specialised symbol tag.",
  },
  ZZ2: {
    label: "Plural letters/symbols",
    description: "Plural or grouped alphabetical-symbol tag.",
  },
  YLIP: {
    label: "Punctuation marker",
    description: "Special punctuation or boundary marker.",
  },
  YQUE: {
    label: "Question mark",
    description: "Question punctuation marker.",
  },
  YSTP: {
    label: "Punctuation marker",
    description: "Special stop or boundary marker.",
  },
};

const classLabels: Record<string, string> = {
  PRON: "Pronoun",
  ART: "Article",
  CONJ: "Conjunction",
  ADJ: "Adjective",
  UNC: "Unclassified",
  PREP: "Preposition",
  SUBST: "Substantive/noun",
  ADV: "Adverb",
  INTERJ: "Interjection",
  VERB: "Verb",
  STOP: "Punctuation/stop",
};

function getFallbackPosLabel(pos: string, wordClass: string | null): string {
  const classLabel = wordClass ? (classLabels[wordClass] ?? wordClass) : null;

  if (classLabel) {
    return `${classLabel} (${pos})`;
  }

  return `Unmapped tag (${pos})`;
}

export function getPosLabel(pos: string | null): string {
  if (!pos) return "Unknown POS";
  return posLabels[pos]?.label ?? `Unmapped tag (${pos})`;
}

export function getPosDescription(pos: string | null): string {
  if (!pos) return "No part-of-speech tag is available.";
  return (
    posLabels[pos]?.description ??
    `The tag "${pos}" has no verified description in this lookup. The original tag is preserved so it can be checked against the BNC tag documentation.`
  );
}

export function getPosLabelWithClass(
  pos: string | null,
  wordClass: string | null,
): string {
  if (!pos) return "Unknown POS";

  const label = posLabels[pos]?.label;

  if (label) {
    if (!wordClass) return label;
    const classLabel = classLabels[wordClass] ?? wordClass;
    return `${label} (${classLabel})`;
  }

  return getFallbackPosLabel(pos, wordClass);
}

export function getPosDescriptionWithClass(
  pos: string | null,
  wordClass: string | null,
): string {
  const description = getPosDescription(pos);
  if (!wordClass) return description;
  const classLabel = classLabels[wordClass] ?? wordClass;
  return `${description} Broad corpus class: ${classLabel}.`;
}
