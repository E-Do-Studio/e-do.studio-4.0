/**
 * Exécute `fn` une fois la prochaine image peinte.
 *
 * Pour le travail qu'un clic déclenche sans que l'écran en dépende : l'INP
 * mesure du clic à la peinture suivante, et tout ce qui tourne dans la même
 * tâche la retarde. `requestAnimationFrame` attend le rendu, le `setTimeout`
 * glisse le travail juste après.
 */
export function afterNextPaint(fn: () => void): void {
  requestAnimationFrame(() => setTimeout(fn, 0));
}
