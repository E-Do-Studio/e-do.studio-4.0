import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PhoneCellProps {
  phone: string;
  phoneHref: string;
  className?: string;
}

/** Le numéro du studio, en cellule : la bande sociale et le pied de page. */
const PhoneCell = ({ phone, phoneHref, className }: PhoneCellProps) => (
  <Button
    variant="cell"
    // `draggable={false}` : un glisser sur un lien emporte le lien au lieu
    // de sélectionner le texte. Sans lui, le numéro ne se copie pas.
    render={<a href={phoneHref} draggable={false} />}
    // `select-text` annule le `select-none` de la variante : le numéro doit
    // pouvoir être copié-collé.
    className={cn(
      'h-11 flex-row items-center justify-center gap-2 px-4 font-mono text-xs tracking-widest whitespace-nowrap no-underline select-text',
      className,
    )}
  >
    <Phone />
    {phone.replace(/^\+33\s?/, '0')}
  </Button>
);

export { PhoneCell };
