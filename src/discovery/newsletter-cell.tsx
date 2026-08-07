import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import { FormCell, FormCellInput } from '../ui/form-cell';
import { MonoLabel } from '../ui/mono-label';

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
    <section
      className={cn(
        'flex min-w-0 flex-col justify-center gap-2 bg-background px-6 py-4',
        className,
      )}
    >
      <MonoLabel tone="primary">Newsletter</MonoLabel>
      <form
        name="newsletter"
        onSubmit={(event) => event.preventDefault()}
        className="flex min-w-0 items-center gap-3"
      >
        <FormCell
          label={t('discoveryPage.emailPlaceholder')}
          hideLabel
          // Le libellé visible serait redondant avec l'intitulé de la cellule
          // juste au-dessus : la cellule se réduit au champ, et le filet passe
          // sous lui plutôt qu'autour.
          className="min-h-0 flex-1 border-b border-border px-0 py-0 pb-1.5 focus-within:border-foreground sm:px-0 sm:py-0"
        >
          <FormCellInput
            value={email}
            onChange={setEmail}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('discoveryPage.emailPlaceholder')}
          />
        </FormCell>
        <Button
          type="submit"
          variant="link"
          className="h-auto shrink-0 gap-1.5 p-0 text-primary no-underline"
        >
          OK <span aria-hidden>→</span>
        </Button>
      </form>
    </section>
  );
};
