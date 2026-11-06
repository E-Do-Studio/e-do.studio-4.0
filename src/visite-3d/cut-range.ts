// Bornes de la coupe horizontale, en mètres au-dessus du sol.
//
// À part de `studio-scene.ts` : le curseur de la page les lit, et importer la
// scène pour trois nombres embarquerait three.js dans le paquet de la page, que
// l'import dynamique de la visionneuse est là pour éviter.
export const CUT_RANGE = { min: 0.6, max: 5.8, initial: 4.2 } as const;
