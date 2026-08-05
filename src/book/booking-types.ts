/** Coordonnées saisies à l'étape contact du tunnel. */
interface ContactState {
  marque: string;
  societe: string;
  siren: string;
  adresseFacturation: string;
  nom: string;
  prenom: string;
  email: string;
  tel: string;
  typesArticles: string[];
  quantiteArticles: string;
  vuesParArticle: string;
  autresInfos: string;
  cgvAccepted: boolean;
  autreType?: string;
}

interface BookPageProps {
  forcedStep?: number;
  forceManual?: boolean;
}

export type { BookPageProps, ContactState };
