import { MediaFrame } from '@/ui/media-frame';
import { ResponsiveImage } from '@/ui/responsive-image';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled, Variants } from './block';

// Une image de démonstration, servie par le stockage de production : c'est la
// seule façon de montrer le `srcset` réel — les dérivés `thumbnail_/small_/
// medium_/large_` n'existent que sur les fichiers passés par Strapi. Un média
// retiré du CMS casse cette vignette et rien d'autre ; la remplacer par
// n'importe quelle URL relevée dans l'onglet Réseau d'une page du site.
const SAMPLE =
  'https://pub-9b79de66b20440cdb7e8bae53605296c.r2.dev/large_1_VEESUAL_27_05_240097_6f50be02c7.jpg';

export const DsMedia = () => (
  <Section
    id="medias"
    title="Médias"
    count="2 composants · 3 ratios"
    intro="Une image ne se dimensionne jamais elle-même : elle remplit un cadre, et c'est le cadre qui porte le ratio, le fond de réserve et le recadrage. Six appelants écrivaient les trois mêmes lignes, dont cinq fractions de ratio différentes en valeur arbitraire."
  >
    <Subsection
      title="MediaFrame"
      note="Le ratio vient de tokens (--aspect-* dans styles.css) et non de valeurs arbitraires : une grille de page a besoin de la même mesure que le cadre, et seul un token se partage. Deux paliers, un par forme de cellule média du site — le 4/1 de la bande d'accueil et le 1,5 des cellules de nav ne cadrent aucune photo et restent en clair là où ils servent."
    >
      <Block
        name="MediaFrame"
        summary="La boîte positionnée d'un média : relative, overflow-clip, un ratio, un fond de réserve. Elle accepte n'importe quel enfant — ResponsiveImage, VideoLoop, l'iframe d'un embed, le SVG de repli — tous se posent en absolute inset-0 et c'est elle qui leur donne la référence. clip et non hidden : un overflow masqué fait du cadre un conteneur de défilement, dont la taille minimale automatique vaut zéro — la grille cesse alors de compter sa hauteur déduite du ratio pour mesurer sa rangée."
        file="src/ui/media-frame.tsx"
        replaces="6 cadres recopiés → 1"
        api={`<MediaFrame ratio="portrait">
  <ResponsiveImage src={url} alt={alt} sizes="25vw" />
</MediaFrame>

// Là où le cadre est lui-même cliquable, il DEVIENT le bouton :
<MediaFrame ratio="portrait" render={<Button variant="cell" size="cell" />}>`}
      >
        <Variants min="200px">
          <Labelled label='ratio="portrait" — 4/5'>
            <MediaFrame ratio="portrait">
              <ResponsiveImage src={SAMPLE} alt="" sizes="200px" />
            </MediaFrame>
          </Labelled>
          <Labelled label='ratio="photo" — 4/3'>
            <MediaFrame ratio="photo">
              <ResponsiveImage src={SAMPLE} alt="" sizes="200px" />
            </MediaFrame>
          </Labelled>
          <Labelled label='ratio="fill" — la hauteur de la cellule'>
            <div className="h-40">
              <MediaFrame ratio="fill">
                <ResponsiveImage src={SAMPLE} alt="" sizes="200px" />
              </MediaFrame>
            </div>
          </Labelled>
        </Variants>
      </Block>

      <Block
        name="MediaFrame — tone"
        summary="Ce qui se voit avant que l'image ne peigne, et autour d'elle en fit=contain. Le gris par défaut : une boîte vide se lit comme un trou. Le fond de page pour les cadres dont le vide reste visible une fois l'image chargée — un plan large en contain, un embed au ratio libre."
        file="src/ui/media-frame.tsx"
        api={`<MediaFrame ratio="photo" tone="background">   // plateau, fit="contain"`}
      >
        {/* Les deux cadres sont vides et bordés : c'est la couleur du fond
            qu'on regarde, et `tone="background"` se confondrait sinon avec le
            blanc du bloc qui l'entoure. */}
        <Variants min="200px">
          <Labelled label='tone="muted" — défaut'>
            <MediaFrame ratio="photo" className="border border-neutral-300" />
          </Labelled>
          <Labelled label='tone="background"'>
            <MediaFrame
              ratio="photo"
              tone="background"
              className="border border-neutral-300"
            />
          </Labelled>
        </Variants>
      </Block>
    </Subsection>

    <Subsection
      title="ResponsiveImage"
      note="Le srcset est synthétisé depuis le motif d'URL de Strapi (thumbnail_ 245w, small_ 500w, medium_ 750w, large_ 1000w) : le navigateur télécharge le plus petit dérivé qui tienne dans la mise en page. Le comportement retombe sur un src unique quand l'URL ne correspond pas — un SVG, une image externe."
    >
      <Block
        name="ResponsiveImage"
        summary="L'image remplit son cadre : le absolute inset-0 h-full w-full object-cover que les six appelants écrivaient chacun de leur côté appartient au composant. sizes reste obligatoire — c'est la seule chose que le composant ne peut pas deviner, et une valeur fausse fait télécharger un dérivé trop gros."
        file="src/ui/responsive-image.tsx"
        replaces="6 lignes de positionnement → 1"
        api={`<ResponsiveImage
  src={url}
  alt={alt}                       // "" si le bouton parent porte déjà le nom
  sizes="(min-width: 1024px) 25vw, 30vw"
  priority                        // au-dessus de la ligne de flottaison
  fit="contain"                   // défaut : cover
/>`}
      >
        <Variants min="200px">
          <Labelled label='fit="cover" — défaut'>
            <MediaFrame ratio="photo">
              <ResponsiveImage src={SAMPLE} alt="" sizes="200px" />
            </MediaFrame>
          </Labelled>
          <Labelled label='fit="contain"'>
            <MediaFrame ratio="photo" tone="background">
              <ResponsiveImage
                src={SAMPLE}
                alt=""
                sizes="200px"
                fit="contain"
              />
            </MediaFrame>
          </Labelled>
        </Variants>
      </Block>
    </Subsection>

    <Subsection
      title="Le chargement"
      note="Deux défauts, deux mécanismes, tous les deux dans styles.css — donc valables aussi pour les images Markdown de Discovery, qui ne passent par aucun composant."
    >
      <Block
        name="img { color: transparent }"
        summary="Entre la mise en page et la peinture, le navigateur dessine la chaîne alt dans la couleur du texte, à l'intérieur de la boîte de l'image. C'est le flash de légende d'une frame avant chaque image. La règle le masque ; img[data-error] le rend à nouveau lisible, parce qu'une image qui ne viendra jamais est le seul moment où ce texte apprend quelque chose."
        file="src/styles.css — @layer base"
        replaces="1 flash → 0"
        api={`img               { color: transparent }
img[data-error]   { color: inherit }`}
      >
        <div className="flex flex-wrap gap-4">
          <Labelled label="src cassé — l'alt reste masqué pendant le chargement">
            <div className="h-24 w-40">
              <MediaFrame ratio="fill">
                <ResponsiveImage
                  src="https://cms.e-do.studio/uploads/large_inexistant.jpg"
                  alt="Le texte alternatif d'une image absente"
                  sizes="160px"
                />
              </MediaFrame>
            </div>
          </Labelled>
        </div>
      </Block>

      <Block
        name="Le fondu à l'apparition"
        summary="200 ms d'opacité, posés par un callback ref et jamais au rendu serveur. Le site est en SSR non streamé : une opacity-0 rendue par le serveur laisserait le site entièrement blanc pour un client sans JS. Le callback, lui, ne s'exécute que côté client, avant la peinture, et peut interroger node.complete — une image déjà en cache n'a rien à fondre."
        file="src/ui/responsive-image.tsx · src/styles.css"
        api={`const fadeIn = useCallback((node) => {
  if (node && !node.complete) node.dataset.loading = '';
}, []);
// onLoad → delete dataset.loading

img[data-loading] { opacity: 0 }   // + transition 200ms, coupée en reduced-motion`}
      >
        <p className="m-0 max-w-3xl text-sm leading-relaxed text-neutral-700">
          Ni useState ni useEffect : un état déclencherait un rendu par image
          chargée, et un effet passerait après la peinture — c'est-à-dire trop
          tard. Le rendu ci-dessus ne montre rien : le fondu ne se voit qu'en
          réseau ralenti, l'onglet Réseau sur « Slow 3G ».
        </p>
      </Block>
    </Subsection>

    <Subsection
      title="Une cellule média ne remplit pas une aire — elle garde son ratio et la colonne défile"
      note="Une cellule qui remplit son aire de grille vaut toujours (rangées / colonnes) × (largeur de l'aire / sa hauteur) : c'est la forme de la FENÊTRE, pas celle qu'on a choisie. Aucune écriture CSS n'y change quoi que ce soit — le ratio n'est pas réglable tant que la cellule remplit. Le seul choix réel est ailleurs : ou bien la cellule remplit et son cadrage suit l'écran, ou bien elle garde son ratio et sa colonne défile."
    >
      <Block
        name="app:content-start app:overflow-y-auto"
        summary="La mosaïque post-prod garde son aire, mais ses rangées passent en auto et la colonne défile. Deux colonnes à toutes les tailles, portrait 4/5 à toutes les tailles : le cadrage d'une photo ne dépend plus de la fenêtre. C'est le motif de la galerie, appliqué à une page à viewport verrouillé."
        file="src/postprod-page.tsx · src/gallery-page.tsx"
        replaces="1 ratio qui suivait l'écran → 1 ratio tenu"
        api={`<div className="grid grid-cols-2 gap-px bg-border
                app:h-full app:min-h-0
                app:content-start app:overflow-y-auto">
  <MediaFrame />   {/* ratio="portrait" par défaut, sans surcharge */}`}
      >
        <p className="m-0 max-w-3xl text-sm leading-relaxed text-neutral-700">
          Ce qui a été essayé avant, et pourquoi ça ne suffisait pas : borner la
          dérive par le nombre de colonnes. Trois colonnes quand l'écran était
          large pour sa hauteur, deux sinon — la cellule restait entre 0,62 et
          1,10 au lieu de descendre à 0,39, mais elle bougeait toujours, et le
          palier changeait le nombre de vignettes par rangée en cours de route,
          donc redécoupait chaque photo au passage. Un palier de largeur seul ne
          marchait pas non plus : à 1120×900 la mosaïque fait 586px de large —
          assez, au sens d'une requête de largeur — mais 844 de haut, ce qui
          redonne 0,46.
        </p>
      </Block>
    </Subsection>
  </Section>
);
