const MAX_CHARS = 80;

// Un e-mail, ou une suite d'au moins huit chiffres ponctuée d'espaces, de
// points, de tirets ou d'un `+` : téléphone, SIREN, SIRET. Un visiteur colle
// volontiers ses coordonnées dans sa première question.
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const DIGITS = /\+?\d(?:[\s.-]?\d){7,}/g;

/**
 * La question du chatbot telle qu'elle part dans `chat_question_asked`.
 *
 * Le masquage précède la coupe : couper d'abord laisserait passer un e-mail
 * tronqué, que le motif ne reconnaîtrait plus. Un nom propre, lui, ne se
 * détecte pas — c'est pourquoi la question est aussi bornée à 80 caractères.
 */
export function questionForAnalytics(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(DIGITS, '[numéro]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS);
}
