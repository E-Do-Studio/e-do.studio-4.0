import type { Bilingual } from '../types';

type B = Bilingual;

export const common = {
  home: { fr: 'Accueil', en: 'Home' } as B,
  loading: { fr: 'Chargement…', en: 'Loading…' } as B,
  menu: { fr: 'Menu', en: 'Menu' } as B,
  close: { fr: 'Fermer', en: 'Close' } as B,
  langToggleLabel: { fr: 'EN', en: 'FR' } as B,
  book: { fr: 'Réserver', en: 'Book' } as B,
  bookNow: { fr: 'Réserver', en: 'Book now' } as B,
  bookThisStage: { fr: 'Réserver ce plateau', en: 'Book this stage' } as B,
  contactUs: { fr: 'Nous contacter', en: 'Contact us' } as B,
  gallery: { fr: 'Galerie', en: 'Gallery' } as B,
  galleryArrow: { fr: 'Galerie →', en: 'Gallery →' } as B,
  stages: { fr: 'Plateaux', en: 'Stages' } as B,
  postProd: { fr: 'Post-prod', en: 'Post-prod' } as B,
  legal: { fr: 'Légal', en: 'Legal' } as B,
  reset: { fr: 'Réinitialiser', en: 'Reset' } as B,
  onRequest: { fr: 'Sur demande', en: 'On request' } as B,
  back: { fr: 'Retour', en: 'Back' } as B,
  continue_: { fr: 'Continuer', en: 'Continue' } as B,
  send: { fr: 'Envoyer', en: 'Send' } as B,
  sending: { fr: 'Envoi en cours…', en: 'Sending…' } as B,
  description: { fr: 'Description', en: 'Description' } as B,
  all: { fr: 'Tout', en: 'All' } as B,
  prevImage: { fr: 'Image précédente', en: 'Previous image' } as B,
  nextImage: { fr: 'Image suivante', en: 'Next image' } as B,
  imageCarousel: { fr: 'Carrousel d’images', en: 'Image carousel' } as B,
  playVideo: { fr: 'Lire la vidéo', en: 'Play video' } as B,
  pauseVideo: { fr: 'Mettre en pause', en: 'Pause video' } as B,
  backToGallery: { fr: 'Retour à la galerie', en: 'Back to gallery' } as B,
  zoomIn: { fr: 'Zoomer', en: 'Zoom in' } as B,
  zoomOut: { fr: 'Dézoomer', en: 'Zoom out' } as B,
  resetZoom: { fr: 'Réinitialiser le zoom', en: 'Reset zoom' } as B,
};

export const galleryPage = {
  categories: { fr: 'Catégories', en: 'Categories' } as B,
  noResults: { fr: 'Aucun résultat', en: 'No results' } as B,
  tryAnotherFilter: {
    fr: 'Essayez un autre filtre.',
    en: 'Try another filter.',
  } as B,
};

export const mobileNav = {
  filters: { fr: 'Filtres', en: 'Filters' } as B,
  applyFilters: { fr: 'Appliquer', en: 'Apply' } as B,
  reset: { fr: 'Réinitialiser', en: 'Reset' } as B,
  closeFilters: { fr: 'Fermer', en: 'Close' } as B,
};

export const resultsCount = (count: number, lang: 'fr' | 'en'): string => {
  if (lang === 'fr') {
    return count <= 1 ? `${count} résultat` : `${count} résultats`;
  }
  return count <= 1 ? `${count} result` : `${count} results`;
};

export const cookieBanner = {
  title: { fr: 'Cookies', en: 'Cookies' } as B,
  body: {
    fr: "Nous utilisons des cookies pour mesurer l'audience du site. Vous pouvez accepter ou refuser. En savoir plus :",
    en: 'We use cookies to measure site audience. You can accept or refuse. Learn more:',
  } as B,
  accept: { fr: 'Accepter', en: 'Accept' } as B,
  reject: { fr: 'Refuser', en: 'Refuse' } as B,
  legalLink: { fr: 'politique cookies', en: 'cookie policy' } as B,
  ariaLabel: {
    fr: 'Bandeau de consentement aux cookies',
    en: 'Cookie consent banner',
  } as B,
};

export const assistant = {
  label: { fr: 'Assistant E-Do', en: 'E-Do assistant' } as B,
  placeholder: { fr: 'Écrire votre demande…', en: 'Type your request…' } as B,
  chatPlaceholder: {
    fr: 'prix, devis, cyclorama…',
    en: 'price, quote, cyclorama…',
  } as B,
  errorFallback: {
    fr: "Désolé, je n'ai pas pu traiter votre demande. Contactez-nous directement à contact@e-do.studio.",
    en: "Sorry, I couldn't process your request. Contact us directly at contact@e-do.studio.",
  } as B,
  rateLimited: {
    fr: 'Trop de messages, réessayez dans quelques minutes ou contactez-nous à contact@e-do.studio.',
    en: 'Too many messages, please try again in a few minutes or email us at contact@e-do.studio.',
  } as B,
  promptQuote: {
    fr: 'Un {devis} ? Une {visite} ? Une question sur la {post-production} ?',
    en: 'A {quote}? A {tour}? A question about {post-prod}?',
  } as B,
  newConversation: { fr: 'Nouvelle conversation', en: 'New conversation' } as B,
  history: { fr: 'Historique', en: 'History' } as B,
  historyEmpty: {
    fr: 'Aucune conversation pour le moment.',
    en: 'No conversations yet.',
  } as B,
  untitledConversation: { fr: 'Sans titre', en: 'Untitled' } as B,
  deleteConversation: {
    fr: 'Supprimer la conversation',
    en: 'Delete conversation',
  } as B,
  bookingRecapTitle: {
    fr: 'Récapitulatif de réservation',
    en: 'Booking summary',
  } as B,
  bookingTotalHT: { fr: 'Total HT', en: 'Total excl. tax' } as B,
  bookingTotalTTC: { fr: 'TTC (TVA 20%)', en: 'incl. tax (20% VAT)' } as B,
  bookingContact: { fr: 'Contact', en: 'Contact' } as B,
  bookingCgv: {
    fr: "J'accepte les conditions générales de vente.",
    en: 'I accept the terms and conditions of sale.',
  } as B,
  bookingEstimateNote: {
    fr: 'Estimation — le créneau et le devis pourront être ajustés par notre équipe après échange.',
    en: 'Estimate — the slot and quote may be adjusted by our team after a chat.',
  } as B,
  bookingConfirm: {
    fr: 'Confirmer la réservation',
    en: 'Confirm booking',
  } as B,
  bookingConfirming: { fr: 'Réservation en cours…', en: 'Booking…' } as B,
  bookingSuccess: {
    fr: 'Réservation confirmée — référence {ref}. Vous allez recevoir un email de confirmation.',
    en: 'Booking confirmed — reference {ref}. You will receive a confirmation email.',
  } as B,
  bookingError: {
    fr: "La réservation n'a pas pu être finalisée. Réessayez ou contactez-nous à contact@e-do.studio.",
    en: 'The booking could not be completed. Please retry or email contact@e-do.studio.',
  } as B,
  bookingConflict: {
    fr: "Ce créneau vient d'être pris. Demandez-moi un autre horaire.",
    en: 'That slot was just taken. Ask me for another time.',
  } as B,
  contactFormTitle: { fr: 'Vos coordonnées', en: 'Your details' } as B,
  contactFirstName: { fr: 'Prénom', en: 'First name' } as B,
  contactLastName: { fr: 'Nom', en: 'Last name' } as B,
  contactEmail: { fr: 'Email', en: 'Email' } as B,
  contactPhone: { fr: 'Téléphone', en: 'Phone' } as B,
  contactCompany: { fr: 'Société', en: 'Company' } as B,
  contactBrand: { fr: 'Marque (optionnel)', en: 'Brand (optional)' } as B,
  contactBillingAddress: {
    fr: 'Adresse de facturation',
    en: 'Billing address',
  } as B,
  contactSiren: { fr: 'SIREN (optionnel)', en: 'SIREN (optional)' } as B,
  contactNotes: {
    fr: 'Autres infos (optionnel)',
    en: 'Other info (optional)',
  } as B,
  contactSubmit: {
    fr: 'Valider mes coordonnées',
    en: 'Submit my details',
  } as B,
  contactErrRequired: {
    fr: 'Prénom, nom, email, téléphone, société et adresse de facturation sont requis.',
    en: 'First name, last name, email, phone, company and billing address are required.',
  } as B,
  contactErrEmail: { fr: 'Email invalide.', en: 'Invalid email.' } as B,
  contactErrSiren: {
    fr: 'SIREN invalide (9 chiffres).',
    en: 'Invalid SIREN (9 digits).',
  } as B,
};

export const bookPicker = {
  title: {
    fr: 'Comment souhaitez-vous réserver ?',
    en: 'How would you like to book?',
  } as B,
  subtitle: {
    fr: 'Trois façons de démarrer — choisissez la plus simple pour vous.',
    en: 'Three ways to get started — pick the one that fits.',
  } as B,
  configuratorLabel: { fr: 'Configurateur', en: 'Configurator' } as B,
  configuratorDesc: {
    fr: 'Configurez votre devis en quelques clics',
    en: 'Build your quote in a few clicks',
  } as B,
  manualLabel: { fr: 'Manuel', en: 'Manual' } as B,
  manualDesc: {
    fr: 'Décrivez votre besoin librement',
    en: 'Describe your need freely',
  } as B,
  contactLabel: { fr: 'Nous contacter', en: 'Talk to us' } as B,
  contactDesc: {
    fr: "Parlez à un membre de l'équipe",
    en: 'Talk to a team member',
  } as B,
  confirmationTitle: {
    fr: 'Demande envoyée',
    en: 'Request sent',
  } as B,
  confirmationMissingTitle: {
    fr: 'Pas de demande récente.',
    en: 'No recent request.',
  } as B,
  confirmationMissingBody: {
    fr: 'Reprenez votre réservation pour finaliser votre demande.',
    en: 'Resume your booking to finalise your request.',
  } as B,
  resumeBooking: { fr: 'Reprendre ma réservation', en: 'Resume booking' } as B,
};

export const booking = {
  title: { fr: 'Réservation', en: 'Booking' } as B,
  needHelp: { fr: "Besoin d'aide", en: 'Need help' } as B,
  yourQuote: { fr: 'Votre devis', en: 'Your quote' } as B,
  manualOr: { fr: 'Choix manuel — ou ', en: 'Manual mode — or ' } as B,
  letUsGuide: {
    fr: '← passer au configurateur',
    en: '← switch to configurator',
  } as B,
  configurator: { fr: 'Configurateur', en: 'Configurator' } as B,
  stage: { fr: 'Plateau', en: 'Stage' } as B,
  multiSelect: {
    fr: 'Sélection multiple possible',
    en: 'Multi-select possible',
  } as B,
  halfDay: { fr: 'Demi-journée', en: 'Half day' } as B,
  fullDay: { fr: 'Journée', en: 'Full day' } as B,
  hourly: { fr: "À l'heure", en: 'Hourly' } as B,
  oneToThreeHours: { fr: '1 à 3 heures', en: '1 to 3 hours' } as B,
  fourToSevenHours: { fr: '4 à 7 heures', en: '4 to 7 hours' } as B,
  eightHours: { fr: '8 heures', en: '8 hours' } as B,
  hourlyDesc: {
    fr: 'Idéal pour un essai ou un shoot rapide.',
    en: 'Ideal for a test or a quick shoot.',
  } as B,
  halfDayDesc: {
    fr: "Bloc 4h, prorata au-delà jusqu'à 7h.",
    en: '4-hour block, pro-rata up to 7 hours.',
  } as B,
  fullDayDesc: {
    fr: 'Journée complète, tarif le plus avantageux.',
    en: 'Full day, best rate.',
  } as B,
  equipOptions: { fr: 'Équipements & options', en: 'Equipment & options' } as B,
  yourDetails: { fr: 'Vos coordonnées', en: 'Your details' } as B,
  billingAddress: {
    fr: 'Adresse de facturation *',
    en: 'Billing address *',
  } as B,
  lastName: { fr: 'Nom *', en: 'Last name *' } as B,
  firstName: { fr: 'Prénom *', en: 'First name *' } as B,
  phonePlaceholder: { fr: 'Téléphone *', en: 'Phone *' } as B,
  qtyItems: { fr: 'Qté articles (SKUs) *', en: 'Qty items (SKUs) *' } as B,
  viewsPerItem: { fr: 'Vues / article *', en: 'Views / item *' } as B,
  estimate: { fr: 'Estimation', en: 'Estimate' } as B,
  validateNextStage: {
    fr: 'Valider · plateau suivant',
    en: 'Validate · next stage',
  } as B,
  submitRequest: { fr: 'Envoyer la demande', en: 'Submit request' } as B,
  receiveQuote: { fr: 'Recevoir mon devis', en: 'Receive my quote' } as B,
  noDateHeld: { fr: 'Sans bloquer de date', en: 'No date held' } as B,
  pickDate: { fr: 'Choisir une date', en: 'Pick a date' } as B,
  bookingInProgress: { fr: 'Réservation…', en: 'Booking…' } as B,
  sendingDots: { fr: 'Envoi…', en: 'Sending…' } as B,
  saveError: {
    fr: 'Erreur lors de la sauvegarde',
    en: 'Failed to save booking',
  } as B,
  noStageSelected: {
    fr: "Aucun plateau sélectionné — revenez à l'étape 01.",
    en: 'No stage selected — go back to step 01.',
  } as B,
  session: { fr: 'Session', en: 'Session' } as B,
  productSessions: { fr: 'Sessions produit', en: 'Product sessions' } as B,
  addSession: { fr: 'Ajouter une session', en: 'Add a session' } as B,
  addAnotherSession: {
    fr: 'Ajouter une autre session produit',
    en: 'Add another product session',
  } as B,
  projectType: { fr: 'Type de projet', en: 'Project type' } as B,
  method: { fr: 'Méthode', en: 'Method' } as B,
  quantity: { fr: 'Quantité', en: 'Quantity' } as B,
  products: { fr: 'produits', en: 'products' } as B,
  views: { fr: 'Vues', en: 'Views' } as B,
  viewsPerProduct: { fr: 'Vues par produit', en: 'Views per product' } as B,
  postProduction: { fr: 'Post-production', en: 'Post-production' } as B,
  videoEditing: { fr: 'Monté vidéo', en: 'Video editing' } as B,
  images: { fr: 'images', en: 'images' } as B,
  yes: { fr: 'oui', en: 'yes' } as B,
  videoEdit: { fr: 'montage vidéo', en: 'video edit' } as B,
  studioVisit: { fr: 'Visite du studio', en: 'Studio visit' } as B,
  cycloPaint: { fr: 'Peinture cyclo', en: 'Cyclo paint' } as B,
  electricity: { fr: 'Électricité', en: 'Electricity' } as B,
  proRataDay: { fr: '(prorata jour/8)', en: '(pro-rata day/8)' } as B,
  company: { fr: 'Société', en: 'Company' } as B,
  requestSent: { fr: 'Demande envoyée', en: 'Request sent' } as B,
  confirmed: { fr: 'Confirmée', en: 'Confirmed' } as B,
  thankYou: { fr: 'Merci, ', en: 'Thank you, ' } as B,
  cycloRequestBody: {
    fr: "Nous avons bien reçu votre demande pour le cyclorama. Un membre de l'équipe vous recontacte sous 24h (jours ouvrés) pour confirmer les détails.",
    en: "We've received your cyclorama request. A team member will contact you within 24h (working days) to confirm details.",
  } as B,
  newRequest: { fr: 'Nouvelle demande', en: 'New request' } as B,
  chooseManually: { fr: 'Choisir manuellement', en: 'Choose manually' } as B,
  configGuide: {
    fr: 'Notre configurateur vous accompagne — ou ',
    en: 'Our configurator guides you — or ',
  } as B,
  pickManually: { fr: 'choisissez manuellement →', en: 'pick manually →' } as B,
  rentalDuration: { fr: 'Durée de location', en: 'Rental duration' } as B,
  chooseDurationEach: {
    fr: 'Choisissez une durée pour chaque plateau (pré rempli selon estimation).',
    en: 'Choose a duration for each stage (pre-filled based on estimate).',
  } as B,
  chooseDurationSingle: {
    fr: 'Choisissez la durée pour votre plateau (pré rempli selon estimation).',
    en: 'Choose a duration for your stage (pre-filled based on estimate).',
  } as B,
  teamOptional: {
    fr: 'Équipe E-DO (optionnel)',
    en: 'E-DO team (optional)',
  } as B,
  postProdOptional: {
    fr: 'Post-production (optionnel)',
    en: 'Post-production (optional)',
  } as B,
  visit: { fr: 'Visite', en: 'Visit' } as B,
  free: { fr: 'Gratuit', en: 'Free' } as B,
  halfDayHours: { fr: '½ journée (5h)', en: 'Half day (5h)' } as B,
  fullDayHours: { fr: 'Journée (10h)', en: 'Full day (10h)' } as B,
  editorialHours: { fr: 'Éditorial (10h)', en: 'Editorial (10h)' } as B,
  editorial: { fr: 'Éditorial', en: 'Editorial' } as B,
  halfDay4h: { fr: '½ journée (4h)', en: 'Half day (4h)' } as B,
  fullDay8h: { fr: 'Journée (8h)', en: 'Full day (8h)' } as B,
  cyclo5h: { fr: '½ journée (5h)', en: 'Half day (5h)' } as B,
  cyclo10h: { fr: 'Journée (10h)', en: 'Full day (10h)' } as B,
  cyclo10hEditorial: { fr: '10h éditorial', en: '10h editorial' } as B,
  editAccordion: { fr: 'modifier', en: 'edit' } as B,
  toDefine: { fr: 'À définir', en: 'To define' } as B,
  remove: { fr: 'Retirer', en: 'Remove' } as B,
  incomplete: { fr: 'incomplet', en: 'incomplete' } as B,
  productType: { fr: 'Type de produit', en: 'Product type' } as B,
  packshotType: { fr: 'Type de packshot', en: 'Packshot type' } as B,
  accessoryType: { fr: "Type d'accessoire", en: 'Accessory type' } as B,
  media: { fr: 'Média', en: 'Media' } as B,
  oneOrBoth: { fr: '(un ou les deux)', en: '(one or both)' } as B,
  numberOfProducts: { fr: 'Nombre de produits', en: 'Number of products' } as B,
  productsAndViews: { fr: 'Produits & vues', en: 'Products & views' } as B,
  multiSelection: { fr: '(multi-sélection)', en: '(multi-select)' } as B,
  postProdByEdo: {
    fr: 'Post-production par E-DO ?',
    en: 'Post-production by E-DO?',
  } as B,
  postProdPriceHint: {
    fr: 'Prix estimatif affiché — ajusté après brief',
    en: 'Estimated price shown — adjusted after brief',
  } as B,
  videoEditingQuestion: { fr: 'Montage vidéo ?', en: 'Video editing?' } as B,
  videoOnlyForVideo: {
    fr: 'Uniquement pour les projets vidéo',
    en: 'Only for video projects',
  } as B,
  cycloFreeProduction: {
    fr: 'Cyclorama / Production libre',
    en: 'Cyclorama / Free production',
  } as B,
  cycloCustomNeeds: {
    fr: 'Besoin sur-mesure, nous établissons un devis personnalisé.',
    en: "Custom needs — we'll prepare a tailored quote based on stage, duration and technical resources.",
  } as B,
  recapRecommendation: {
    fr: 'Récap — recommandation',
    en: 'Recap — recommendation',
  } as B,
  estimateTweakable: {
    fr: 'estimation, ajustable',
    en: 'estimate, tweakable',
  } as B,
  continueToBooking: {
    fr: 'Continuer vers la réservation',
    en: 'Continue to booking',
  } as B,
  cycloHalfDayDesc: {
    fr: 'Bloc de 5h, parfait pour un shoot packshot ciblé.',
    en: '5-hour block, perfect for a focused packshot shoot.',
  } as B,
  cycloFullDayDesc: {
    fr: 'Bloc de 10h, volume e-commerce ou campagne.',
    en: '10-hour block, e-commerce volume or campaign.',
  } as B,
  editorialDesc: {
    fr: 'Tarif réduit presse, usage personnel ou portfolio.',
    en: 'Reduced rate for press, personal or portfolio use.',
  } as B,
  pressPersonal: { fr: 'Presse / personnel', en: 'Press / personal' } as B,
  visitIntro: {
    fr: 'La visite est gratuite et dure environ une heure. Nous vous recontactons pour confirmer le créneau.',
    en: 'Studio visit is free and lasts about an hour. We will confirm the slot by phone.',
  } as B,
  freeByAppointment: {
    fr: 'Gratuit · sur rendez-vous',
    en: 'Free · by appointment',
  } as B,
  numberOfHours: { fr: "Nombre d'heures", en: 'Number of hours' } as B,
  hoursHalfDay: {
    fr: "Nombre d'heures · demi-journée",
    en: 'Hours · half day',
  } as B,
  totalDuration: { fr: 'Durée totale', en: 'Total duration' } as B,
  cycloOptionsDesc: {
    fr: 'Options spécifiques au cyclorama (peinture fraîche, électricité additionnelle).',
    en: 'Cyclorama-specific options (fresh paint, extra electricity).',
  } as B,
  noExtraOptions: {
    fr: 'Aucune option supplémentaire requise. Le matériel standard est inclus.',
    en: 'No extra options required. Standard kit is included.',
  } as B,
  freshCycloPaint: {
    fr: 'Peinture fraîche du cyclo',
    en: 'Fresh cyclo paint',
  } as B,
  repaintedBeforeArrival: {
    fr: 'Repeint avant votre arrivée · forfait',
    en: 'Repainted before your arrival · flat fee',
  } as B,
  extraElectricity: {
    fr: 'Électricité additionnelle',
    en: 'Extra electricity',
  } as B,
  standardKitIncluded: {
    fr: "Matériel standard inclus : fonds, supports, blocs d'alimentation, Wi-Fi pro.",
    en: 'Standard kit included: backdrops, stands, power blocks, pro Wi-Fi.',
  } as B,
  recommended: { fr: 'Recommandé', en: 'Recommended' } as B,
  rateOnRequestBrief: {
    fr: 'Tarif sur demande selon le brief',
    en: 'Rate on request based on brief',
  } as B,
  included: { fr: 'Inclus', en: 'Included' } as B,
  addLabel: { fr: 'Ajouter', en: 'Add' } as B,
  postProdSelectionDesc: {
    fr: 'Sélection, retouche, livraison — chiffrage sur demande selon le volume.',
    en: 'Selection, retouching, delivery — quoted on request based on volume.',
  } as B,
  yesLabel: { fr: 'Oui', en: 'Yes' } as B,
  noLabel: { fr: 'Non', en: 'No' } as B,
  videoEditOnlyVideo: {
    fr: 'Uniquement si votre projet inclut de la vidéo — chiffrage sur demande.',
    en: 'Only if your project includes video — quoted on request.',
  } as B,
  brand: { fr: 'Marque', en: 'Brand' } as B,
  companyStar: { fr: 'Société *', en: 'Company *' } as B,
  itemTypes: { fr: "Type d'articles *", en: 'Item types *' } as B,
  specifyOtherType: {
    fr: "Précisez (autre type d'articles)…",
    en: 'Specify (other item type)…',
  } as B,
  otherInfo: { fr: 'Autres informations', en: 'Other information' } as B,
  otherInfoPlaceholder: {
    fr: 'Contraintes, inspirations, références… (facultatif)',
    en: 'Constraints, inspirations, references… (optional)',
  } as B,
  liveEstimate: { fr: 'estimation live', en: 'live estimate' } as B,
  breakdown: { fr: 'Détail', en: 'Breakdown' } as B,
  date: { fr: 'Date', en: 'Date' } as B,
  dates: { fr: 'Dates', en: 'Dates' } as B,
  reference: { fr: 'Référence', en: 'Reference' } as B,
  issued: { fr: 'Émis le', en: 'Issued' } as B,
  contactLabel: { fr: 'Contact', en: 'Contact' } as B,
  quoteBreakdown: { fr: 'Détail du devis*', en: 'Quote breakdown*' } as B,
  quoteSent: { fr: 'Devis envoyé', en: 'Quote sent' } as B,
  quoteLabel: { fr: 'Devis', en: 'Quote' } as B,
  quoteOnItsWay: {
    fr: 'Votre devis arrive.',
    en: 'Your quote is on its way.',
  } as B,
  bookingConfirmed: {
    fr: 'Réservation confirmée',
    en: 'Booking confirmed',
  } as B,
  booked: { fr: 'Réservée', en: 'Booked' } as B,
  youreBooked: { fr: "C'est réservé.", en: "You're booked." } as B,
  backHome: { fr: "Retour à l'accueil", en: 'Back home' } as B,
  notSet: { fr: 'Non fixée', en: 'Not set' } as B,
  postProdEstimateWarning: {
    fr: '⚠ Prix post-production estimatif — ajusté après brief selon volume et complexité.',
    en: '⚠ Post-production price is an estimate — adjusted after brief based on volume and complexity.',
  } as B,
  quoteDisclaimer: {
    fr: '* Les montants affichés sont une estimation indicative basée sur les éléments renseignés et ne constituent pas un devis définitif. Le devis final, contractuel et signable, vous sera adressé par e-mail après brief avec notre équipe et pourra être ajusté selon le volume réel, la complexité, les vues additionnelles ou la post-production.',
    en: '* The amounts shown are an indicative estimate based on the information provided and do not constitute a final quote. The final, contractual and signable quote will be sent by email after a brief with our team and may be adjusted based on actual volume, complexity, additional views or post-production.',
  } as B,
  calFree: { fr: 'libre', en: 'free' } as B,
  calBooked: { fr: 'Complet', en: 'Booked' } as B,
  calFullDayLabel: { fr: 'journée', en: 'full day' } as B,
  arrivalTime: { fr: "Heure d'arrivée", en: 'Arrival time' } as B,
  weekendFullDayOnly: {
    fr: 'Week-end : journée complète uniquement',
    en: 'Weekend: full-day booking only',
  } as B,
  todayLabel: { fr: "Aujourd'hui", en: 'Today' } as B,
  slotAlreadyBooked: {
    fr: 'Créneau déjà réservé',
    en: 'Time slot already booked',
  } as B,
  pastTimeSlot: { fr: 'Créneau passé', en: 'Past time slot' } as B,
  calFreeLegend: { fr: 'Libre', en: 'Free' } as B,
  calPartialLegend: { fr: 'Partiel', en: 'Partial' } as B,
  calUnavailableLegend: { fr: 'Indisponible', en: 'Unavailable' } as B,
  calSelectedLegend: { fr: 'Sélectionné', en: 'Selected' } as B,
  calPartial: { fr: 'partiel', en: 'partial' } as B,
  calLoading: { fr: 'Chargement…', en: 'Loading…' } as B,
  calPrevMonth: { fr: 'Mois précédent', en: 'Previous month' } as B,
  calNextMonth: { fr: 'Mois suivant', en: 'Next month' } as B,
  dayUnit: { fr: 'j', en: 'd' } as B,
  halfDayShort: { fr: '½ j', en: '½ d' } as B,
  visitSlotLabel: { fr: 'visite', en: 'visit' } as B,
  editorialSuffix: { fr: '10h éditorial', en: '10h editorial' } as B,
  cgvAcceptFr: { fr: "J'accepte les", en: 'I accept the' } as B,
  cgvLink: {
    fr: 'conditions générales de vente',
    en: 'terms and conditions of sale',
  } as B,
  cgvSuffix: {
    fr: 'et les modalités de paiement.',
    en: 'and payment terms.',
  } as B,
};

export const discoveryPage = {
  backToJournal: { fr: 'Retour journal', en: 'Back to journal' } as B,
  close: { fr: 'Fermer', en: 'Close' } as B,
  readArticle: { fr: "Lire l'article", en: 'Read article' } as B,
  readFallback: {
    fr: "Lire l'article complet sur Discovery.",
    en: 'Read the full article on Discovery.',
  } as B,
  studioOpen: { fr: 'Studio · 7j/7', en: 'Studio · 7d/7' } as B,
  behindScenes: { fr: 'Coulisses', en: 'Behind the scenes' } as B,
  morePosts: { fr: "Plus d'articles", en: 'More posts' } as B,
  noPosts: { fr: 'Aucun article', en: 'No posts' } as B,
  noFeaturedPost: { fr: 'Article à la une', en: 'Featured article' } as B,
  noFeaturedPostHint: {
    fr: 'Le premier article du journal arrive bientôt.',
    en: 'The first journal entry is coming soon.',
  } as B,
  noSecondaryPost: { fr: 'Article suivant', en: 'Next article' } as B,
  nextArticle: { fr: 'Article suivant', en: 'Next article' } as B,
  noSecondaryPostHint: {
    fr: 'Un nouveau format est en préparation.',
    en: 'A new long-form piece is on its way.',
  } as B,
  noArticleBody: {
    fr: 'Le contenu de cet article sera bientôt disponible.',
    en: 'This article will be available shortly.',
  } as B,
  quote: {
    fr: "On apprend en faisant. On partage ce qu'on apprend.",
    en: 'We learn by doing. We share what we learn.',
  } as B,
  emailPlaceholder: { fr: 'votre@email.com', en: 'your@email.com' } as B,
};
