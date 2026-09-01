import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import { FormCell, FormCellInput } from '../ui/form-cell';

interface NewsletterCellProps {
  className?: string;
}

// ⚠ Ce formulaire n'envoie rien, et c'est un choix acté, pas un oubli : il
// n'existe aucun point de collecte d'inscriptions côté serveur — ni table
// Supabase, ni fonction Edge, ni propriété HubSpot. Le jour où la destination
// existera, c'est `onSubmit` qu'il faudra brancher, rien d'autre.
//
// La cellule, elle, est celle du site : `FormCell` fabrique l'identifiant et
// l'apparie au libellé (`useId` + `htmlFor` + `aria-describedby`). Ce fichier en
// était une troisième réécriture, avec un identifiant en dur et un `<label>` nu.
export const NewsletterCell = ({ className }: NewsletterCellProps) => {
  const t = useT();
  const [email, setEmail] = useState('');

  return (
    // La cellule EST le champ, sans retrait à elle : c'est `FormCell` qui porte
    // les 20px, donc le tracé de focus longe les bords de la cellule — comme
    // sur les dix champs de la page contact et les quatorze du tunnel.
    //
    // Écrit autrement, ce champ dessinait un filet sous la saisie et laissait
    // par-dessus le tracé de focus de `FormCell` : au clic, un rectangle noir
    // apparaissait à l'intérieur de la cellule, autour du libellé et de la
    // saisie, à quelques pixels des bords. C'est exactement la boîte dans une
    // boîte que `form-cell.tsx` documente et qu'il existe pour supprimer — un
    // seul bord d'un seul état, celui de la cellule.
    // `app:h-cta` : le pied de la colonne mesure la bande d'action qui lui fait
    // face, sans quoi la cellule retombe sur la hauteur de la cible tactile —
    // 78px — et son sur-titre descend de 5px sous celui du pavé.
    <section
      className={cn('flex min-w-0 flex-col bg-background app:h-cta', className)}
    >
      <form
        name="newsletter"
        onSubmit={(event) => event.preventDefault()}
        className="flex min-w-0 flex-1"
      >
        {/* Le libellé visible EST le libellé du champ : `Newsletter` le nommait
            déjà à l'écran, mais dans un `<span>` frère, et l'attribut `label`
            recevait le placeholder — le champ s'appelait donc « votre@email.com »
            pour un lecteur d'écran. */}
        <FormCell
          label="Newsletter"
          labelClassName="text-primary"
          // `justify-between` : la cible tactile mesure 44px et le libellé plus
          // la saisie n'en font que 38. Le mou allait au-dessus de la saisie,
          // qui remontait de 8px au-dessus du titre de la cellule voisine ;
          // réparti, il pose la ligne de saisie en face d'elle.
          //
          // `p-5` et non le retrait par défaut de la cellule de formulaire :
          // c'est celui des cellules de cette page, et il aligne le sur-titre
          // sur celui du pavé d'action, de l'autre côté du filet.
          className="min-w-0 flex-1 justify-between p-5 sm:p-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <FormCellInput
              value={email}
              onChange={setEmail}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('discoveryPage.emailPlaceholder')}
            />
            {/* Le bouton d'envoi de l'assistant, à l'identique : c'est la même
                intention — l'action au bout d'un champ d'une ligne — et le chat
                l'avait déjà résolue.

                Ce qui était écrit ici : « OK » suivi d'une flèche tapée au
                clavier, en orange, sur un `variant="link"`. Trois écarts d'un
                coup — un libellé qui n'existe nulle part ailleurs sur le site,
                un `→` de texte là où toute action du système porte une icône
                `ArrowRight` (il en reste deux, collés à des libellés de lien
                dans `contact-page.tsx`), et l'orange d'une action principale
                pour un envoi d'inscription.

                `disabled` tant que le champ est vide, comme le chat : la flèche
                s'allume quand il y a quelque chose à envoyer. */}
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              disabled={!email.trim()}
              aria-label={t('common.send')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowRight />
            </Button>
          </span>
        </FormCell>
      </form>
    </section>
  );
};
