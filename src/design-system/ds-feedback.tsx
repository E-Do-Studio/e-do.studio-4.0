import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { StatusBadge } from '@/ui/status-badge';
import { Section, Subsection } from '@/dev-inventory/section';
import { Block, Labelled, Variants } from './block';

export const DsFeedback = () => (
  <Section
    id="feedback"
    title="États & feedback"
    count="4 composants"
    intro="Vide et en erreur. Pas de composant de chargement : le rendu est SSR non-diffusé, toutes les données sont résolues par les loaders avant le rendu, et une page n'a donc aucun état intermédiaire à habiller. Le seul écran qui attend est le chatbot, et il a sa bulle de saisie."
  >
    <Subsection title="Empty">
      <Variants min="280px">
        <Block
          name="Empty"
          summary="Trois échelles d'état vide : la cellule étroite, le bloc, la page entière."
          file="src/components/ui/empty.tsx"
          frameClassName="p-0"
          api={`<Empty size="compact">
  <EmptyHeader>
    <EmptyTitle>Aucun projet</EmptyTitle>
    <EmptyDescription>Aucun résultat pour ces filtres.</EmptyDescription>
  </EmptyHeader>
</Empty>`}
        >
          <Empty size="compact">
            <EmptyHeader>
              <EmptyTitle>Aucun projet</EmptyTitle>
              <EmptyDescription>
                Aucun résultat pour ces filtres.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Block>
      </Variants>
    </Subsection>

    <Subsection title="StatusBadge">
      <Block
        name="StatusBadge"
        summary="La pastille d'état. Carrée, comme tout le reste — sept versions étaient dessinées à la main, dont une avec le seul rayon effectif et la seule ombre du site."
        file="src/ui/status-badge.tsx"
        replaces="7 pastilles → 1"
        api={`<StatusBadge>Nouveau</StatusBadge>
<StatusBadge tone="outline">Inclus</StatusBadge>
<StatusBadge size="count">3</StatusBadge>
<StatusBadge size="md" render={<output />}>Confirmé</StatusBadge>`}
      >
        <div className="flex flex-wrap items-center gap-6">
          <Labelled label='tone="primary"'>
            <StatusBadge>Nouveau</StatusBadge>
          </Labelled>
          <Labelled label='tone="outline"'>
            <StatusBadge tone="outline">Inclus</StatusBadge>
          </Labelled>
          <Labelled label='tone="muted"'>
            <StatusBadge tone="muted">Brouillon</StatusBadge>
          </Labelled>
          <Labelled label='size="md"'>
            <StatusBadge size="md">Confirmé</StatusBadge>
          </Labelled>
          <Labelled label='size="count"'>
            <StatusBadge size="count">3</StatusBadge>
          </Labelled>
          <Labelled label='tone="overlay" — sur média'>
            <span className="relative inline-block bg-foreground p-3">
              <StatusBadge tone="overlay">Vidéo</StatusBadge>
            </span>
          </Labelled>
        </div>
      </Block>
    </Subsection>

    <Subsection title="Alert">
      <Block
        name="Alert"
        summary="L'erreur. Une seule couleur : destructive. Une des quatre écritures précédentes la peignait en orange de marque, indistinguable d'une mise en valeur."
        file="src/components/ui/alert.tsx"
        replaces="4 traitements → 1"
        api={`<Alert variant="destructive" className="rounded-none">
  <AlertDescription>{message}</AlertDescription>
</Alert>`}
      >
        <Alert variant="destructive" className="rounded-none">
          <AlertDescription>
            L’envoi a échoué. Vérifiez votre connexion et réessayez.
          </AlertDescription>
        </Alert>
      </Block>
    </Subsection>
  </Section>
);
