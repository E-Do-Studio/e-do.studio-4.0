import type { ReactNode } from 'react';
import { MonoLabel } from '@/ui/mono-label';
import { RailCell } from '@/ui/rail-cell';
import { StepBand } from '@/ui/step-band';
import { StepHeading } from '@/ui/step-heading';
import { useT } from '../../i18n/use-t';
import type { Question } from './configurator-questions';

// Un bloc de l'accordéon du configurateur : replié, il se lit et se rouvre ;
// déplié, il porte son bandeau et son contenu.
//
// C'était une fonction de rendu privée à `step-configurator` (`accQ`), c'est-à-
// dire un DESSIN sans nom, sans props documentées et sans place dans une revue :
// un `Button variant="cell"` de cent trente caractères de classes, portant le
// seul `border-b-foreground` du dépôt sur une cellule de rail.
//
// Deux registres, et c'est voulu : une question repliée est une NAVIGATION —
// d'où `RailCell`, la même cellule que le rail d'étapes à gauche — quand une
// question ouverte est une SECTION, d'où `StepBand`. Le tunnel manuel emploie
// déjà exactement ces deux registres, l'un dans chaque colonne ; l'accordéon les
// fait alterner dans la même.
//
// Le numéro et l'intitulé viennent de `buildQuestions`, jamais du site d'appel.
// Ils y étaient écrits en dur — `number="03"`, `t('booking.packshotType')` —
// alors que `configurator-questions.ts` les calcule déjà, chemin par chemin.
// Deux sources pour une valeur, c'est par là que ça dérive : le numéro affiché
// et le numéro de la version repliée pouvaient diverger.

interface ConfiguratorQuestionProps {
  /**
   * Clé de la question dans `buildQuestions`.
   *
   * Absente de la liste, le chemin courant ne pose pas cette question et rien
   * n'est rendu. C'est CE test qui rend inutiles les gardes que le site d'appel
   * écrivait au-dessus de chaque bloc (`S.product === 'pap' && …`) : elles
   * redisaient mot pour mot les conditions de `buildQuestions`.
   */
  qKey: string;
  questions: Question[];
  /** Clés dépliées, telles que `openQuestionKeys` les calcule. */
  openKeys: Set<string>;
  /** Rouvre une question repliée — sans la marquer touchée. */
  onReopen: (key: string) => void;
  /**
   * Première interaction dans le corps déplié.
   *
   * Distincte de `onReopen` : `openQuestionKeys` se sert de « touchée » pour
   * décider si la précédente reste visible et si la suivante s'ouvre. Les
   * confondre replierait la question précédente au simple fait de rouvrir
   * celle-ci.
   */
  onInteract: (key: string) => void;
  /** Mention à côté de l'intitulé : « (un ou les deux) », « (multi-sélection) ». */
  subtitle?: string;
  children: ReactNode;
}

const ConfiguratorQuestion = ({
  qKey,
  questions,
  openKeys,
  onReopen,
  onInteract,
  subtitle,
  children,
}: ConfiguratorQuestionProps) => {
  const t = useT();
  const question = questions.find((x) => x.key === qKey);
  if (!question) return null;

  // L'enveloppe des deux branches porte `flex flex-col last:flex-1` : la pile est
  // plus haute que ses blocs, et le blanc du bas doit APPARTENIR au dernier —
  // sans ça il traîne sous un filet qui n'est à personne, et c'est la cale de
  // 16px qui fermait le fichier avant. Sur l'enveloppe et non sur le contenu :
  // posé sur la cellule ou sur la grille, il les étirerait ; ici il n'étire que
  // du vide. Même mécanisme qu'aux étapes Plateau et Durée.
  //
  // `last:[&>*:last-child]:border-b` ferme le contenu du DERNIER bloc, et de lui
  // seul. Entre deux questions, le filet appartient au `divide-y` de la pile ;
  // sous la dernière, il n'y a plus de `divide-y` — et son contenu s'arrête au
  // milieu du blanc de l'enveloppe, sans rien pour le clore. Deux champs et une
  // gouttière verticale qui s'interrompt en l'air, c'est ce que ça donnait.
  // Posé sur le contenu et non sur l'enveloppe : celle-ci descend jusqu'au bas
  // de la pile, le trait tomberait donc contre la barre d'action au lieu de
  // suivre les cellules.
  //
  // Ce filet-là ferme le CONTENU ; celui de la colonne appartient au pavé
  // d'action, qui le pose en `border-t` (`book-page.tsx`). Les deux coïncident
  // dès que le contenu descend jusqu'en bas — une grille de tuiles, qui prend la
  // hauteur restante, ou n'importe quel bloc sur un écran trop court pour lui.
  // C'est le pavé qui les fond, par un `-mt-px` : ici on ne sait pas s'il y a un
  // après, et surtout pas s'il touche.
  if (!openKeys.has(qKey)) {
    if (!question.answered) return null;
    return (
      <div className="flex flex-col last:flex-1 last:[&>*:last-child]:border-b last:[&>*:last-child]:border-border">
        <RailCell
          number={question.num}
          label={question.label}
          active={false}
          onSelect={() => onReopen(qKey)}
          trailing={
            <span className="flex min-w-0 items-baseline gap-3">
              <span className="min-w-0 text-balance text-right font-mono text-xs tracking-tight">
                {question.summary}
              </span>
              <MonoLabel tone="muted" className="shrink-0">
                {t('booking.edit')}
              </MonoLabel>
            </span>
          }
          // Le retrait de la COLONNE DE CONTENU, pas celui du rail : les
          // questions repliées côtoient des `StepBand` à 20px, et les 16px du
          // rail décalaient leur bord gauche sur toute la hauteur de
          // l'accordéon.
          pad="cell"
          // `border-b-0` : la pile de l'accordéon coud entre deux questions
          // (`divide-y`), la cellule n'a donc pas à se fermer elle-même.
          // `RailCell` le fait parce qu'un RAIL est plus haut que sa liste — une
          // question repliée, non : elle a toujours une voisine ou une barre
          // d'actions derrière elle.
          className="border-b-0"
        />
      </div>
    );
  }

  return (
    // `onClickCapture` et non `onClick` : les tuiles appellent `resetFrom`, qui
    // remet `openQ` à `null`. En phase de bulle, on rouvrirait la question qu'on
    // vient de quitter.
    <div
      className="flex flex-col last:flex-1 last:[&>*:last-child]:border-b last:[&>*:last-child]:border-border"
      onClickCapture={() => onInteract(qKey)}
    >
      <StepBand>
        <StepHeading
          number={question.num}
          title={question.label}
          subtitle={subtitle}
        />
      </StepBand>
      {children}
    </div>
  );
};

export { ConfiguratorQuestion };
export type { ConfiguratorQuestionProps };
