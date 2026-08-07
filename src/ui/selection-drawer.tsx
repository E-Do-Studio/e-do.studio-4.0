import { useId, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { ordinal } from '@/lib/format';
import { HoverMarquee } from './hover-marquee';
import { RailCell } from './rail-cell';
import { MonoLabel, monoLabelVariants } from './mono-label';

// Le rail, sous le palier où il n'y a plus de place pour une colonne : une
// barre collante qui montre l'élément courant, et un tiroir qui liste les
// autres.
//
// Trois pages en portaient une copie — post-prod, plateau et légal — avec la
// MÊME chaîne de classes recopiée au caractère près (`min-h-14 w-full gap-4
// border-b border-border px-4 py-3 text-left`) et trois arrangements internes
// différents. Le commentaire de `plateau-page.tsx` reconnaissait d'ailleurs
// copier le gabarit de `MobileNavStrip`. Les trois sont supprimées.
//
// Ce composant ne remplace PAS `MobileNavStrip`, malgré la ressemblance de
// surface. Celui-ci choisit une destination parmi N et referme ; celui-là gère
// plusieurs groupes de filtres, un brouillon, des compteurs vivants et une
// validation différée. Les fondre donnerait une API dont la moitié des props
// s'excluent mutuellement — un composant qu'on ne saurait plus appeler. Ils
// partagent ce qui doit l'être : la cellule (`RailCell`) et le tiroir
// (`Drawer`).

export interface SelectionDrawerItem {
  key: string;
  label: string;
  /** Troisième ligne : tarif, tagline. */
  sub?: string;
}

interface SelectionDrawerProps {
  /** Intitulé du tiroir, et nom accessible du déclencheur. */
  title: string;
  items: SelectionDrawerItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Numérote les entrées, comme le rail desktop. */
  numbered?: boolean;
  closeLabel: string;
  className?: string;
}

export const SelectionDrawer = ({
  title,
  items,
  activeKey,
  onSelect,
  numbered = true,
  closeLabel,
  className,
}: SelectionDrawerProps) => {
  const autoId = useId();
  const sheetId = `selection-drawer-${autoId}`;
  const [open, setOpen] = useState(false);

  const activeIndex = items.findIndex((i) => i.key === activeKey);
  const active = activeIndex >= 0 ? items[activeIndex] : undefined;

  return (
    <>
      {/* `top-header` et non un littéral : la barre se cale sous l'en-tête
          collant, dont la hauteur est un token partagé. Trois copies écrivaient
          `h-14` en dur, soit la même valeur que `--spacing-header`, mais sans
          le lien — le jour où l'en-tête change, elles se décalent. */}
      {/* `app:hidden` et non `md:hidden` : cette barre REMPLACE le rail, qui
          n'apparaît qu'à `app`. En `md`, elle disparaissait à 768 quand le rail
          n'arrivait qu'à 1024 — plateaux, post-prod et mentions légales
          n'avaient plus aucune navigation entre 768 et 1023px. `md` ne décide
          jamais du layout, seulement de la place disponible. */}
      <div
        className={cn(
          'sticky top-header z-30 flex h-header items-stretch border-b border-border bg-background app:hidden',
          className,
        )}
        role="toolbar"
        aria-label={title}
      >
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={sheetId}
          variant="cell"
          size="cell"
          className="min-h-tap w-full flex-row items-center gap-2 bg-transparent px-4"
        >
          {numbered && activeIndex >= 0 && (
            <MonoLabel className="shrink-0 tabular-nums">
              {ordinal(activeIndex)}
            </MonoLabel>
          )}
          <HoverMarquee className="text-base tracking-tight text-foreground">
            {active?.label ?? title}
          </HoverMarquee>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {active?.sub && (
              <HoverMarquee className={monoLabelVariants({ tone: 'muted' })}>
                {active.sub}
              </HoverMarquee>
            )}
            <ChevronsUpDown
              width="16"
              height="16"
              className="shrink-0 text-foreground"
            />
          </span>
        </Button>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent id={sheetId}>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerClose
              aria-label={closeLabel}
              render={<Button variant="ghost" size="icon" />}
            >
              <X />
            </DrawerClose>
          </DrawerHeader>
          <ul className="m-0 flex list-none flex-col overflow-y-auto p-0">
            {items.map((item, i) => (
              <li key={item.key}>
                {/* La même cellule que le rail desktop. Les trois copies
                    rendaient ici un cinquième gabarit, à 56px, avec une flèche
                    à droite — alors que la colonne d'à côté, sur la même page,
                    en rendait un autre. */}
                <RailCell
                  number={numbered ? ordinal(i) : undefined}
                  label={item.label}
                  sub={item.sub}
                  density={item.sub ? 'tall' : 'default'}
                  active={item.key === activeKey}
                  onSelect={() => {
                    onSelect(item.key);
                    setOpen(false);
                  }}
                />
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  );
};
