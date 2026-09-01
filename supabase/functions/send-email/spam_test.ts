import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { scoreContactSubmission, type ContactSubmission } from "./spam.ts";

function submission(overrides: Partial<ContactSubmission>): ContactSubmission {
  return {
    nom: "Marie Dubois",
    email: "marie.dubois@example.com",
    telephone: "+33 6 12 34 56 78",
    societe: "Studio Ligne Claire",
    message: "Bonjour, je souhaite réserver le plateau pour un shooting en septembre.",
    ...overrides,
  };
}

Deno.test("flags the captured bot payload", () => {
  const verdict = scoreContactSubmission({
    nom: "JSvBzPEYhqmTcJZGezM",
    email: "do.c.torda.d.10@gmail.com",
    telephone: "7738752811",
    societe: "SJWjlOEnGqIctzeDmkn",
    message: "itIUYSpAIsImnzzQHTg",
  });

  assert(verdict.isSpam, `expected spam, got score ${verdict.score}`);
  assert(verdict.reasons.includes("gibberish_nom"));
  assert(verdict.reasons.includes("gibberish_societe"));
  assert(verdict.reasons.includes("gibberish_identity_pair"));
});

Deno.test("flags other random-string variants", () => {
  const variants: ContactSubmission[] = [
    {
      nom: "QwErTyUiOpAsDfGh",
      email: "x9k2@gmail.com",
      telephone: "3125550142",
      societe: "ZxCvBnMqWeRtYu",
      message: "PoIuYtReWqLkJhGf",
    },
    {
      nom: "bkzrmtqvlxnwphdj",
      email: "noreply@gmail.com",
      telephone: "2135550199",
      societe: "trwmkxbzvqnlhdps",
      message: "vqkzrtmwbxnlpdhj",
    },
  ];

  for (const variant of variants) {
    assert(scoreContactSubmission(variant).isSpam, `expected spam for ${variant.nom}`);
  }
});

Deno.test("lets legitimate submissions through", () => {
  const legitimate: Array<Partial<ContactSubmission>> = [
    {},
    // Short foreign name + acronym company: both below the token floor.
    { nom: "Li Wu", societe: "SNCF", message: "Hello, could we book a half day next week?" },
    // CamelCase brand names must not read as random case flipping.
    { nom: "Jean-Pierre Dupont", societe: "TotalEnergies" },
    { nom: "Anne Lefèvre", societe: "ArcelorMittal" },
    { nom: "Søren Kjærgaard", societe: "McDonald's France" },
    // Long single-word surname, natural vowel distribution.
    { nom: "Konstantinos Papadopoulos", societe: "Papadopoulos Photography" },
    { nom: "Marie-Christine Van Der Berghe", societe: "Studio Rotterdam" },
    // English, terse, all lowercase.
    { message: "hi, do you rent the studio for a full day shoot in october?" },
    // A message that is only a URL trips one signal — not enough on its own.
    { message: "https://www.mon-portfolio-photographie.com" },
    { nom: "Élodie Rousseau", societe: "Agence Verticale", message: "Devis pour 2 jours svp" },
  ];

  for (const overrides of legitimate) {
    const payload = submission(overrides);
    const verdict = scoreContactSubmission(payload);
    assertEquals(
      verdict.isSpam,
      false,
      `false positive on "${payload.nom}" / "${payload.societe}" (score ${verdict.score}, ${verdict.reasons.join(",")})`,
    );
  }
});
