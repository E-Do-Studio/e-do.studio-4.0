import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useT } from '../../i18n/use-t';
import type { BookingSession } from '../../lib/booking-engine';
import { isSessionValid, makeBlankSession } from '../../lib/booking-engine';
import {
  ACCESS_SUBS,
  MEDIA_OPTIONS,
  PACKSHOT_VIEWS,
  PAP_METHODS,
  PAP_PACKSHOT_SUBS,
  PRODUCTS,
  PROJECT_TYPES,
  catDesc,
  catLabel,
} from '../catalog';
import { SelectTile } from '@/ui/select-tile';
import { SectionIntro } from '@/ui/section-intro';
import { ToggleRow } from '@/ui/toggle-row';
import { ordinal } from '@/lib/format';
import { SessionTabs } from './session-tabs';
import { ConfiguratorQuestion } from './configurator-question';
import {
  CASCADES,
  buildQuestions,
  openQuestionKeys,
} from './configurator-questions';
import { BookingModeBanner } from '../booking-mode-banner';
import { FormCell, FormCellInput } from '@/ui/form-cell';

interface StepConfiguratorProps {
  sessions: BookingSession[];
  setSessions: Dispatch<SetStateAction<BookingSession[]>>;
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  onSkip: () => void;
  onReset: () => void;
}

const StepConfigurator = ({
  sessions,
  setSessions,
  activeIdx,
  setActiveIdx,
  onSkip,
  onReset,
}: StepConfiguratorProps) => {
  const t = useT();
  const active = sessions[activeIdx] || sessions[0];
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [touchedQs, setTouchedQs] = useState<Set<string>>(new Set());
  const touchQ = (k: string) =>
    setTouchedQs((prev) => {
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  const setSession = (patch: Partial<BookingSession>) => {
    setSessions((prev) =>
      prev.map((s, i) => (i === activeIdx ? { ...s, ...patch } : s)),
    );
  };
  const resetFrom = (field: keyof BookingSession, value: unknown) => {
    setSession({ [field]: value, ...(CASCADES[field] || {}) });
    setOpenQ(null);
    setTouchedQs(new Set());
  };
  const addSession = () => {
    setSessions((prev) => [...prev, makeBlankSession()]);
    setActiveIdx(sessions.length);
    setOpenQ(null);
    setTouchedQs(new Set());
  };
  const removeSession = (idx: number) => {
    if (sessions.length <= 1) return;
    setSessions((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, Math.min(activeIdx, sessions.length - 2)));
  };
  const S = active;
  const questions = buildQuestions(S, t);
  const openKeys = openQuestionKeys(questions, openQ, touchedQs);
  const onInteract = (key: string) => {
    touchQ(key);
    setOpenQ(key);
  };
  const media = Array.isArray(S.media) ? S.media : S.media ? [S.media] : [];

  return (
    // Pas de `overflow-y-auto h-full` : la coquille du tunnel porte déjà son
    // scroller (`book-page.tsx`), et cette étape en posait un SECOND à
    // l'intérieur. Le premier ne défilait donc jamais, et la remise à zéro du
    // défilement au changement d'étape visait un élément immobile — revenir au
    // configurateur rouvrait au milieu de la liste.
    //
    // `min-h-full` + `flex-col`, et `flex-1` sur la pile : la zone de contenu est
    // plus haute que les questions, et le reste tombait en blanc sous elles —
    // d'où la cale de 16px qui fermait le fichier. Même mécanisme qu'aux étapes
    // Plateau et Durée.
    <div className="flex min-h-full flex-col bg-background">
      <BookingModeBanner
        hint={t('booking.ourConfiguratorGuidesYouOr')}
        switchLabel={t('booking.chooseManually')}
        direction="forward"
        // Le seul bandeau collant de l'étape — les `StepBand` des questions ne
        // le sont pas. Deux `sticky top-0` se superposent, et c'est le plus loin
        // dans le DOM qui gagne.
        className="sticky top-0 z-10"
        onReset={() => {
          setSessions([makeBlankSession()]);
          setActiveIdx(0);
          setOpenQ(null);
          setTouchedQs(new Set());
          if (onReset) onReset();
        }}
        onSwitch={onSkip}
      />
      {sessions.length > 1 && (
        <SessionTabs
          sessions={sessions}
          activeIdx={activeIdx}
          onSelect={(idx) => {
            setActiveIdx(idx);
            setOpenQ(null);
            setTouchedQs(new Set());
          }}
          onRemove={removeSession}
        />
      )}
      {/* `divide-y` : le filet entre deux questions appartient à CE conteneur,
          qui seul sait qu'il y a une question suivante. Chaque bloc le posait
          lui-même en `border-b` sur sa grille — donc aussi sous le DERNIER, où
          il se doublait avec le `border-t` de la barre d'actions. `divide-y` ne
          coud qu'entre deux enfants, jamais aux extrémités.

          Corollaire : aucune grille ci-dessous ne porte de `border-b`. Il ne
          leur reste que `gap-px bg-border`, la gouttière ENTRE leurs tuiles.

          `flex-1 auto-rows-fr` sur toutes les grilles de TUILES : la dernière
          question ouverte occupe la hauteur restante et ses gouttières courent
          d'un bord à l'autre, comme à l'étape Plateau. `auto-rows-fr` va avec
          `flex-1` et n'est pas décoratif — une grille étirée dont les rangées ne
          le sont pas laisse voir l'aire libre du conteneur, qui est noire.

          Les grilles de CHAMPS, elles, ne s'étirent jamais : une cellule de
          formulaire est `cursor-text`, et l'étirer donne des centaines de pixels
          de blanc cliquable qui n'écrivent rien. Le blanc restant sous elles
          revient à l'enveloppe du bloc. */}
      <div className="flex flex-1 flex-col divide-y divide-border">
        <ConfiguratorQuestion
          qKey="projectType"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
        >
          <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-px bg-border @md:grid-cols-2">
            {PROJECT_TYPES.map((pt, i) => (
              <SelectTile
                key={pt.k}
                number={ordinal(i)}
                title={catLabel(t, pt)}
                desc={catDesc(t, pt)}
                selected={S.projectType === pt.k}
                onSelect={() => resetFrom('projectType', pt.k)}
              />
            ))}
          </div>
        </ConfiguratorQuestion>

        <ConfiguratorQuestion
          qKey="product"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
        >
          <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-px bg-border @md:grid-cols-2 @2xl:grid-cols-3">
            {PRODUCTS.map((p, i) => (
              <SelectTile
                key={p.k}
                number={ordinal(i)}
                title={catLabel(t, p)}
                desc={catDesc(t, p)}
                selected={S.product === p.k}
                onSelect={() => resetFrom('product', p.k)}
              />
            ))}
          </div>
        </ConfiguratorQuestion>

        <ConfiguratorQuestion
          qKey="method"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
        >
          <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-px bg-border @md:grid-cols-2">
            {PAP_METHODS.map((m, i) => (
              <SelectTile
                key={m.k}
                number={ordinal(i)}
                title={catLabel(t, m)}
                desc={catDesc(t, m)}
                selected={S.method === m.k}
                onSelect={() => resetFrom('method', m.k)}
              />
            ))}
          </div>
        </ConfiguratorQuestion>

        {/* Un seul bloc pour les deux sous-types. Ils vivaient en double —
            packshot et accessoires — sous la MÊME clé de question, avec le même
            balisage et deux catalogues. Seul le catalogue diffère, et
            `buildQuestions` porte déjà le numéro et l'intitulé de chacun.

            Pas d'étape à deux colonnes : trois tuiles y laisseraient une piste
            vide, et dans une grille `gap-px bg-border` une piste vide peint un
            bloc noir. */}
        <ConfiguratorQuestion
          qKey="submethod"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
        >
          <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-px bg-border @xl:grid-cols-3">
            {(S.product === 'accessoires'
              ? ACCESS_SUBS
              : PAP_PACKSHOT_SUBS
            ).map((sub, i) => (
              <SelectTile
                key={sub.k}
                number={ordinal(i)}
                title={catLabel(t, sub)}
                desc={catDesc(t, sub)}
                selected={S.submethod === sub.k}
                onSelect={() => resetFrom('submethod', sub.k)}
              />
            ))}
          </div>
        </ConfiguratorQuestion>

        <ConfiguratorQuestion
          qKey="media"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
          subtitle={t('booking.oneOrBoth')}
        >
          {/* `size="sm"` : « Photo » et « Vidéo » n'ont ni sous-titre ni
              description — c'est le gabarit du titre seul, celui des vues plus
              bas. Le plancher de `md` réservait 128px pour deux mots. */}
          <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-px bg-border">
            {MEDIA_OPTIONS.map((m, i) => {
              const on = media.includes(m.k);
              return (
                <SelectTile
                  key={m.k}
                  size="sm"
                  number={ordinal(i)}
                  title={catLabel(t, m)}
                  desc={catDesc(t, m)}
                  selected={on}
                  onSelect={() =>
                    setSession({
                      media: on
                        ? media.filter((x) => x !== m.k)
                        : [...media, m.k],
                    })
                  }
                />
              );
            })}
          </div>
        </ConfiguratorQuestion>

        <ConfiguratorQuestion
          qKey="quantity"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
        >
          {/* Le libellé de la cellule est VISIBLE, comme dans toutes les autres
              cellules de formulaire du site. Masqué, il ne restait dans le bloc
              qu'un placeholder gris au bord gauche d'une bande blanche de neuf
              cents pixels : rien ne disait qu'on pouvait écrire là, et la ligne
              se lisait comme une question REPLIÉE de l'accordéon — même largeur,
              même filet, une valeur grise alignée à gauche. C'est le libellé qui
              fait qu'une cellule se lit comme un champ ; il est visible partout
              ailleurs (étape contact, formulaire de contact), et l'exception
              n'existait qu'ici.

              « Quantité » et non « Nombre de produits » : le bandeau pose déjà
              la question, et redire ses trois mots à trente pixels d'écart était
              la raison pour laquelle on l'avait masqué. Le bandeau demande, la
              cellule nomme ce qu'elle contient.

              `gap-2` comme aux deux cellules de « produits × vues » : c'est
              l'écart d'une cellule de formulaire qui vit seule dans son bloc,
              pas au milieu d'une grille de dix. */}
          <FormCell label={t('booking.quantity')} className="gap-2">
            <FormCellInput
              kind="count"
              value={S.quantity}
              onChange={(v) => setSession({ quantity: v.replace(/\D/g, '') })}
              placeholder="12"
              inputMode="numeric"
            />
          </FormCell>
        </ConfiguratorQuestion>

        <ConfiguratorQuestion
          qKey="views"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
          subtitle={t('booking.multiSelect')}
        >
          {/* `auto-fit` et non un palier : la liste fait TROIS ou QUATRE tuiles
              selon que le sous-type est « ghost ». Un `grid-cols-4` laisserait
              une piste vide dans le premier cas, et une piste vide dans une
              grille `gap-px bg-border` peint un bloc noir. `auto-fit` replie la
              piste inoccupée. */}
          <div className="grid flex-1 auto-rows-fr grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-px bg-border">
            {PACKSHOT_VIEWS.filter(
              (v) => v.k !== '3/4' || S.submethod === 'ghost',
            ).map((v, i) => {
              const on = (S.views || []).includes(v.k);
              return (
                <SelectTile
                  key={v.k}
                  size="sm"
                  number={ordinal(i)}
                  title={catLabel(t, v)}
                  selected={on}
                  onSelect={() => {
                    const cur = S.views || [];
                    setSession({
                      views: on ? cur.filter((x) => x !== v.k) : [...cur, v.k],
                    });
                  }}
                />
              );
            })}
          </div>
        </ConfiguratorQuestion>

        <ConfiguratorQuestion
          qKey="qtyViews"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
        >
          {/* Ni `flex-1` ni `auto-rows-fr`, contrairement aux grilles de tuiles :
              une cellule de formulaire est `cursor-text`, donc l'étirer produit
              quatre cents pixels de blanc CLIQUABLE qui n'écrivent rien — le
              défaut que `FormCellTextarea fill` documente déjà pour le
              formulaire de contact. Une tuile est une surface, un champ a une
              hauteur qui veut dire quelque chose.

              Le blanc restant sous la grille revient à l'enveloppe du bloc
              (`last:flex-1`), comme aux lignes post-prod. */}
          <div className="grid grid-cols-1 gap-px bg-border @md:grid-cols-2">
            <FormCell label={t('booking.numberOfProducts')} className="gap-2">
              <FormCellInput
                kind="count"
                value={S.quantity}
                onChange={(v) => setSession({ quantity: v.replace(/\D/g, '') })}
                placeholder="12"
                inputMode="numeric"
              />
            </FormCell>
            <FormCell label={t('booking.viewsPerProduct')} className="gap-2">
              <FormCellInput
                kind="count"
                value={S.viewsCount}
                onChange={(v) =>
                  setSession({ viewsCount: v.replace(/\D/g, '') })
                }
                placeholder="3"
                inputMode="numeric"
              />
            </FormCell>
          </div>
        </ConfiguratorQuestion>

        <ConfiguratorQuestion
          qKey="postprod"
          questions={questions}
          openKeys={openKeys}
          onReopen={setOpenQ}
          onInteract={onInteract}
        >
          {/* Une colonne, deux lignes qui s'empilent. Le nombre de colonnes se
              décidait en `gridTemplateColumns` inline, selon que le montage
              vidéo était visible — une valeur inline qui, en plus, ne se
              surcharge pas au point d'arrêt. Deux lignes à bascule s'empilent,
              c'est tout ce que ça demandait. */}
          <div className="flex flex-col gap-px bg-border">
            <ToggleRow
              title={t('booking.postProductionByEDo')}
              hint={t('booking.estimatedPriceShownAdjustedAfter')}
              stateLabel={S.postprod ? t('booking.yes') : t('booking.no')}
              checked={!!S.postprod}
              onCheckedChange={() =>
                setSession({
                  postprod: !S.postprod,
                  postprodVideo: S.postprod ? false : S.postprodVideo,
                })
              }
            />
            {media.includes('video') && S.postprod && (
              <ToggleRow
                title={t('booking.videoEditing2')}
                hint={t('booking.onlyForVideoProjects')}
                stateLabel={
                  S.postprodVideo ? t('booking.yes') : t('booking.no')
                }
                checked={!!S.postprodVideo}
                onCheckedChange={() =>
                  setSession({ postprodVideo: !S.postprodVideo })
                }
              />
            )}
          </div>
        </ConfiguratorQuestion>

        {/* Même enveloppe `last:flex-1` que les blocs de question : c'est au
            DERNIER enfant de la pile, quel qu'il soit, que revient le blanc du
            bas. Posé sur le bouton lui-même, il l'étirerait sur toute la hauteur
            restante. */}
        {S.projectType === 'cyclorama' && (
          <div className="flex flex-col last:flex-1">
            <SectionIntro
              size="xs"
              as="h2"
              title={t('booking.cycloramaFreeProduction')}
              subtitle={t('booking.customNeedsWeLlPrepare')}
              className="bg-muted"
            />
          </div>
        )}

        {isSessionValid(active) && activeIdx === sessions.length - 1 && (
          // La seule invitation à ajouter une session. L'en-tête des onglets en
          // portait une seconde, à une autre géométrie et sous un autre libellé
          // — et elle proposait d'ajouter pendant qu'on remplissait la session
          // courante, ce que cette condition-ci interdit.
          //
          // `border-b` alors que la pile coud en `divide-y` : ce bouton n'est
          // PAS le dernier élément visible de la colonne — sous lui s'étend le
          // blanc de l'enveloppe, puis le récapitulatif ou la barre d'action. Il
          // lui faut donc sa propre couture pour se fermer, sinon il flotte, une
          // ligne de libellé sans bord bas au milieu du vide. C'est le même cas
          // qu'un `RailHeader`, qui ferme aussi sous lui.
          <div className="flex flex-col last:flex-1">
            <Button
              type="button"
              onClick={addSession}
              variant="cell"
              size="touch"
              className="w-full shrink-0 justify-start border-b border-border px-pad-cell"
            >
              <Plus data-icon="inline-start" />
              {t('booking.addASession')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export { StepConfigurator };
export type { StepConfiguratorProps };
