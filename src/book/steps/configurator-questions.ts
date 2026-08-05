import type { TFunction } from 'i18next';
import type { BookingSession } from '../../lib/booking-engine';
import { isSessionValid } from '../../lib/booking-engine';
import type { CatalogEntry } from '../catalog';
import {
  ACCESS_SUBS,
  MEDIA_OPTIONS,
  PACKSHOT_VIEWS,
  PAP_METHODS,
  PAP_PACKSHOT_SUBS,
  PRODUCTS,
  PROJECT_TYPES,
  catLabel,
  findEntry,
} from '../catalog';

/** Produits dont la question « média » suit directement le choix du produit. */
const DIRECT_MEDIA_PRODUCTS = ['eyewear', 'food', 'cosmetique', 'bijoux'];

/**
 * Ce qu'une réponse invalide en aval. Répondre à nouveau au type de projet
 * remet tout le reste à zéro, répondre au média ne touche qu'aux quantités.
 * Sans cette cascade, une session gardait un sous-type incompatible avec son
 * nouveau produit.
 */
const CASCADES: Record<string, Partial<BookingSession>> = {
  projectType: {
    product: null,
    method: null,
    submethod: null,
    media: [],
    views: [],
    viewsCount: '',
    quantity: '',
    postprod: false,
    postprodVideo: false,
  },
  product: {
    method: null,
    submethod: null,
    media: [],
    views: [],
    viewsCount: '',
    quantity: '',
    postprod: false,
    postprodVideo: false,
  },
  method: {
    submethod: null,
    media: [],
    views: [],
    viewsCount: '',
    quantity: '',
    postprod: false,
    postprodVideo: false,
  },
  submethod: {
    media: [],
    views: [],
    viewsCount: '',
    quantity: '',
    postprod: false,
    postprodVideo: false,
  },
  media: {
    views: [],
    viewsCount: '',
    quantity: '',
    postprod: false,
    postprodVideo: false,
  },
};

interface Question {
  key: string;
  /** Numéro affiché ; dépend du chemin suivi, d'où son calcul ici. */
  num: string;
  label: string;
  answered: boolean;
  /** Résumé affiché quand la question est repliée. */
  summary: string;
}

const joinLabels = (
  t: TFunction,
  catalog: CatalogEntry[],
  keys: string[] | undefined,
) =>
  (keys || [])
    .map((k) => catLabel(t, findEntry(catalog, k)))
    .filter(Boolean)
    .join(' + ');

/**
 * L'enchaînement de questions pour une session, tel que son état le déplie.
 * Chaque produit suit son propre chemin : le prêt-à-porter passe par une
 * méthode puis un sous-type, l'accessoire directement par un sous-type, les
 * autres directement par le média.
 */
function buildQuestions(s: BookingSession, t: TFunction): Question[] {
  const questions: Question[] = [
    {
      key: 'projectType',
      num: '00',
      label: t('booking.projectType'),
      answered: !!s.projectType,
      summary: catLabel(t, findEntry(PROJECT_TYPES, s.projectType)),
    },
  ];
  if (s.projectType === 'ecom') {
    questions.push({
      key: 'product',
      num: '01',
      label: t('booking.productType'),
      answered: !!s.product,
      summary: catLabel(t, findEntry(PRODUCTS, s.product)),
    });
  }
  if (s.product === 'pap') {
    questions.push({
      key: 'method',
      num: '02',
      label: t('booking.method'),
      answered: !!s.method,
      summary: catLabel(t, findEntry(PAP_METHODS, s.method)),
    });
  }
  if (s.product === 'pap' && s.method === 'packshot') {
    questions.push({
      key: 'submethod',
      num: '03',
      label: t('booking.packshotType'),
      answered: !!s.submethod,
      summary: catLabel(t, findEntry(PAP_PACKSHOT_SUBS, s.submethod)),
    });
  }
  if (s.product === 'accessoires') {
    questions.push({
      key: 'submethod',
      num: '02',
      label: t('booking.accessoryType'),
      answered: !!s.submethod,
      summary: catLabel(t, findEntry(ACCESS_SUBS, s.submethod)),
    });
  }
  if (isMediaVisible(s)) {
    questions.push({
      key: 'media',
      num: s.product === 'pap' || s.product === 'accessoires' ? '03' : '02',
      label: t('booking.media'),
      answered: (s.media || []).length > 0,
      summary: joinLabels(t, MEDIA_OPTIONS, s.media),
    });
  }
  if (isPackshotSized(s)) {
    questions.push({
      key: 'quantity',
      num: '04',
      label: t('booking.numberOfProducts'),
      answered: !!Number(s.quantity),
      summary: s.quantity ? `${s.quantity} ${t('booking.products')}` : '',
    });
    questions.push({
      key: 'views',
      num: '05',
      label: t('booking.viewsPerProduct'),
      // « Détail » seul ne suffit pas : il complète une vue principale.
      answered: (s.views || []).some((v) => v !== 'detail'),
      summary: joinLabels(t, PACKSHOT_VIEWS, s.views),
    });
  }
  if (isMediaVisible(s) && (s.media || []).length > 0) {
    questions.push({
      key: 'qtyViews',
      num: s.product === 'pap' || s.product === 'accessoires' ? '04' : '03',
      label: t('booking.productsViews'),
      answered: !!Number(s.quantity) && !!Number(s.viewsCount),
      summary:
        s.quantity && s.viewsCount
          ? `${s.quantity} ${t('booking.prod')} × ${s.viewsCount} ${t('booking.views2')}`
          : '',
    });
  }
  if (s.projectType === 'ecom' && s.product && isSessionValid(s)) {
    questions.push({
      key: 'postprod',
      num: 'pp',
      label: t('common.postProdLong'),
      // Toujours « répondue » : ne pas cocher est une réponse.
      answered: true,
      summary: s.postprod
        ? s.postprodVideo
          ? t('booking.yesVideo')
          : t('booking.yes')
        : t('booking.no'),
    });
  }
  return questions;
}

const isMediaVisible = (s: BookingSession) =>
  (s.product === 'pap' && s.method === 'onmodel') ||
  (s.product === 'accessoires' && !!s.submethod) ||
  DIRECT_MEDIA_PRODUCTS.includes(s.product ?? '');

const isPackshotSized = (s: BookingSession) =>
  s.product === 'pap' && s.method === 'packshot' && !!s.submethod;

/**
 * Les questions à déplier. Une seule est ouverte à la fois — la première sans
 * réponse, ou celle que l'utilisateur a rouverte — mais ses voisines
 * immédiates le sont aussi tant qu'il ne les a pas touchées : répondre fait
 * apparaître la suivante sans replier ce qu'on vient de faire.
 */
function openQuestionKeys(
  questions: Question[],
  reopened: string | null,
  touched: Set<string>,
): Set<string> {
  if (questions.length === 0) return new Set();
  const firstUnanswered = questions.findIndex((q) => !q.answered);
  const autoOpen =
    firstUnanswered >= 0
      ? questions[firstUnanswered].key
      : questions[questions.length - 1].key;
  const currentIdx = questions.findIndex(
    (q) => q.key === (reopened ?? autoOpen),
  );
  const current = questions[currentIdx];

  const open = new Set<string>();
  if (current) open.add(current.key);
  // La précédente reste visible tant que la courante n'a pas été touchée.
  const prev = questions[currentIdx - 1];
  if (prev?.answered && current && !touched.has(current.key)) {
    open.add(prev.key);
  }
  // La suivante s'ouvre dès que la courante est répondue et touchée.
  const next = questions[currentIdx + 1];
  if (next && current?.answered && touched.has(current.key)) {
    open.add(next.key);
  }
  return open;
}

export {
  CASCADES,
  DIRECT_MEDIA_PRODUCTS,
  buildQuestions,
  isMediaVisible,
  isPackshotSized,
  openQuestionKeys,
};
export type { Question };
