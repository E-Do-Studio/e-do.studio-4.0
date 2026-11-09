// Heuristic spam scoring for the public contact form.
//
// Pure and I/O-free so it can be unit-tested against real captured payloads.
// Every signal is a weight, never a veto: a single quirk (a foreign name, a
// message that is just a URL) must not block a human. Only an accumulation
// crosses SPAM_THRESHOLD.

export interface ContactSubmission {
  nom: string;
  email: string;
  telephone: string;
  societe: string;
  message: string;
}

export interface SpamVerdict {
  score: number;
  reasons: string[];
  isSpam: boolean;
}

export const SPAM_THRESHOLD = 4;

const VOWELS = new Set("aeiouyàâäéèêëïîôöùûüÿœæ");

// Below 10 letters, natural short names and acronyms (SNCF, Li Wu, BMW) are
// indistinguishable from noise, so the detector stays silent there.
const MIN_TOKEN_LENGTH = 10;
const MAX_VOWEL_RATIO = 0.28;
const MIN_CASE_ALTERNATIONS = 4;

function lettersOf(token: string): string {
  return token.replace(/[^\p{L}]/gu, "");
}

function vowelRatio(letters: string): number {
  if (letters.length === 0) return 1;
  let vowels = 0;
  for (const ch of letters.toLowerCase()) {
    if (VOWELS.has(ch)) vowels++;
  }
  return vowels / letters.length;
}

// Bots that concatenate random characters flip case constantly; human words
// change case at most once or twice (CamelCase brands like TotalEnergies).
function caseAlternations(letters: string): number {
  let alternations = 0;
  for (let i = 1; i < letters.length; i++) {
    const prev = letters[i - 1];
    const cur = letters[i];
    const prevUpper = prev === prev.toUpperCase() && prev !== prev.toLowerCase();
    const curUpper = cur === cur.toUpperCase() && cur !== cur.toLowerCase();
    if (prevUpper !== curUpper) alternations++;
  }
  return alternations;
}

function isGibberishToken(token: string): boolean {
  const letters = lettersOf(token);
  if (letters.length < MIN_TOKEN_LENGTH) return false;
  return vowelRatio(letters) < MAX_VOWEL_RATIO || caseAlternations(letters) >= MIN_CASE_ALTERNATIONS;
}

function hasGibberish(value: string): boolean {
  return value.trim().split(/\s+/).some(isGibberishToken);
}

export function scoreContactSubmission(submission: ContactSubmission): SpamVerdict {
  const reasons: string[] = [];
  let score = 0;

  const nomGibberish = hasGibberish(submission.nom);
  const societeGibberish = hasGibberish(submission.societe);
  const messageGibberish = hasGibberish(submission.message);

  if (nomGibberish) {
    score += 2;
    reasons.push("gibberish_nom");
  }
  if (societeGibberish) {
    score += 2;
    reasons.push("gibberish_societe");
  }
  if (messageGibberish) {
    score += 2;
    reasons.push("gibberish_message");
  }

  // Two independently random identity fields is a far stronger signal than
  // either one alone.
  if (nomGibberish && societeGibberish) {
    score += 2;
    reasons.push("gibberish_identity_pair");
  }

  const message = submission.message.trim();
  if (message.length >= 12 && !/\s/.test(message)) {
    score += 2;
    reasons.push("message_without_whitespace");
  }

  return { score, reasons, isSpam: score >= SPAM_THRESHOLD };
}
