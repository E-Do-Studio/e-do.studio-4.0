# Documentation Technique — Système de Réservation e-do.studio

## 1. Architecture Globale

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (React SPA)                                            │
│  src/book-page.tsx — wizard multi-étapes                         │
│  src/lib/booking-schema.ts — validation Zod bilingue             │
│  src/lib/availability.ts — hook temps réel (useAvailability)     │
│  src/lib/bookings.ts — createBooking() + helpers                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │ supabase-js (anon key)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Edge Functions)                          │
│  Tables: bookings, booking_sessions, booking_quotes, ical_feeds  │
│  RLS: anon INSERT/SELECT, service_role ALL                       │
│  Edge Functions: calendar-sync, send-email                       │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Schéma Base de Données

### 2.1 Table `bookings`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | Identifiant unique |
| `reference` | text (unique) | Référence publique (EDO-R-XXXXXX, EDO-Q-XXXXXX, EDO-XXXXXX) |
| `status` | enum | `draft` \| `pending` \| `confirmed` \| `cancelled` |
| `client_name` | text | Prénom + Nom |
| `client_email` | text | Email client |
| `client_company` | text | Société |
| `client_siren` | text | Numéro SIREN (9 chiffres) |
| `client_phone` | text | Téléphone |
| `project_type` | text | Type de projet (e-commerce, packshot, etc.) |
| `urgency` | text | Niveau d'urgence |
| `total_estimate` | numeric(12,2) | Devis total estimé |
| `notes` | text | Informations complémentaires |
| `preferred_date` | date | Date souhaitée |
| `arrival_hour` | int | Heure d'arrivée (9–19) |
| `created_at` | timestamptz | Date de création |
| `updated_at` | timestamptz | Mise à jour auto (trigger) |

### 2.2 Table `booking_sessions`

Une ligne par plateau réservé dans un booking.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | — |
| `booking_id` | uuid (FK → bookings) | Lien parent |
| `plateau_key` | text | Identifiant plateau (live, eclipse, horizontal, vertical, cyclorama, visite) |
| `slot_type` | text | Type de créneau (hour, half, full) |
| `hours` | int | Durée en heures |
| `cyclo_mode` | text | Mode cyclorama (null si autre plateau) |
| `product_type` | text | Type de produit |
| `method` | text | Méthode de prise de vue |
| `submethod` | text | Sous-méthode |
| `media` | jsonb | Types de media sélectionnés |
| `views` | jsonb | Vues sélectionnées |
| `views_count` | int | Nombre de vues par article |
| `quantity` | int | Quantité d'articles |
| `postprod_enabled` | boolean | Post-production activée |
| `postprod_video` | boolean | Post-prod vidéo activée |

### 2.3 Table `booking_quotes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | — |
| `booking_id` | uuid (FK) | Lien parent |
| `reference` | text | Référence devis |
| `rows` | jsonb | Lignes du devis `[{ lbl, amt, onReq?, estimate? }]` |
| `total` | numeric(12,2) | Total calculé |
| `generated_at` | timestamptz | Date de génération |

### 2.4 Table `ical_feeds`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid (PK) | — |
| `booking_id` | uuid (FK) | Lien parent |
| `feed_url` | text | URL du feed iCal |
| `ical_uid` | text | UID de l'événement |
| `synced_at` | timestamptz | Dernière synchronisation |

### 2.5 RLS (Row Level Security)

- **anon** : INSERT + SELECT sur bookings, booking_sessions, booking_quotes (le frontend utilise la clé anonyme)
- **authenticated** : SELECT uniquement
- **service_role** : ALL (Edge Functions)
- **ical_feeds** : service_role ALL + authenticated SELECT

## 3. Logique de Disponibilité

**Fichier** : `src/lib/availability.ts`

**Hook** : `useAvailability(plateauKey, year, month)`

**Algorithme** :

1. Requête Supabase : bookings avec `status IN ('pending', 'confirmed')` + `booking_sessions.plateau_key = X`
2. Agrégation des heures par jour du mois
3. Classification :
   - `>= 8h` booked → **unavailable** (gris)
   - `> 0h et < 8h` → **limited** (orange)
   - `0h` → **free** (vert)

**Cache** : Map en mémoire par clé `${plateauKey}-${year}-${month}`. Invalidé uniquement au rechargement de page.

**Constantes** : `MAX_HOURS_PER_DAY = 10`, `LIMITED_THRESHOLD = 8`

## 4. Flux de Création de Réservation

**Fichier** : `src/lib/bookings.ts` → `createBooking(input)`

```
1. Génération de référence unique (EDO-R-/EDO-Q-/EDO- + 6 chars alphanumériques)
2. INSERT → bookings (status = 'pending' si booking, 'draft' si quote/request)
3. INSERT → booking_sessions[] (une ligne par plateau)
4. INSERT → booking_quotes (lignes du devis + total)
5. Fire-and-forget → Edge Function calendar-sync (POST /functions/v1/calendar-sync)
6. Fire-and-forget → Edge Function send-email (POST /functions/v1/send-email)
7. Retour → { booking, reference }
```

### Modes de soumission

| Mode | Référence | Status initial | Date requise |
|------|-----------|----------------|--------------|
| `booking` | EDO-R-XXXXXX | `pending` | Oui |
| `quote` | EDO-Q-XXXXXX | `draft` | Non |
| `request` | EDO-XXXXXX | `draft` | Non |

### Interface TypeScript

```typescript
interface CreateBookingInput {
  mode: 'quote' | 'booking' | 'request';
  contact: {
    nom: string;
    prenom: string;
    email: string;
    tel: string;
    societe: string;
    siren: string;
    adresseFacturation: string;
    marque: string;
    autresInfos: string;
  };
  projectType: string | null;
  urgency: string | null;
  sessions: BookingSessionData[];
  quote: { rows: { lbl: string; amt: number; onReq?: boolean; estimate?: boolean }[]; total: number };
  preferredDate: { y: number; m: number; d: number } | null;
  arrivalHour: number | null;
}
```

## 5. Validation du Formulaire Contact

**Fichier** : `src/lib/booking-schema.ts`

**Technologie** : Zod avec messages bilingues (FR/EN)

### Champs obligatoires

| Champ | Règle |
|-------|-------|
| `societe` | min 1 char |
| `siren` | regex `^\d{9}$` |
| `adresseFacturation` | min 1 char |
| `nom` | min 1 char |
| `prenom` | min 1 char |
| `email` | format email valide |
| `tel` | min 6 chars, regex `^[\d\s+\-().]+$` |
| `cgvAccepted` | littéral `true` |

### Champs conditionnels (si `requireProductFields: true`)

| Champ | Règle |
|-------|-------|
| `typesArticles` | array, min 1 élément |
| `quantiteArticles` | string non vide |
| `vuesParArticle` | string non vide |

### Usage

```typescript
import { validateContact } from './booking-schema';

const result = validateContact(formData, 'fr', { requireProductFields: true });
if (!result.success) {
  // result.errors → Record<string, string>
}
```

## 6. Parcours Utilisateur (Wizard 7 Étapes)

**Fichier** : `src/book-page.tsx`

| Étape | Nom | Description |
|-------|-----|-------------|
| 0 | Configurateur | Questionnaire IA pour recommander une session (optionnel) |
| 1 | Choix plateau | Grille multi-sélection des 6 plateaux avec tarifs |
| 2 | Durée | Sélection horaire / demi-journée / journée par plateau |
| 3 | Équipe | Sélection optionnelle de membres E-DO (styliste, opérateur, etc.) |
| 4 | Post-prod | Options de retouche / montage vidéo |
| 5 | Contact | Formulaire client (validation Zod) |
| 6 | Date | Calendrier avec dispo + sélecteur heure d'arrivée |
| 7 | Récapitulatif | Relecture + soumission |

### Règles métier clés

- **Weekends** : bloqués pour les réservations < 8h (journée complète requise)
- **Horaires** : arrivée entre 9h et 19h, fin max à 19h
- **Cyclorama** : demi-journée = 5h, journée = 10h (différent des autres plateaux : 4h / 8h)
- **Devis dynamique** : recalculé à chaque changement d'option, affiché dans le SidePanel

## 7. Grille Tarifaire

### Plateaux

| Plateau | Heure | Demi-journée | Journée |
|---------|-------|--------------|---------|
| Live | 185€ | 620€ (4h) | 1 120€ (8h) |
| Eclipse | 160€ | 560€ (4h) | 990€ (8h) |
| Horizontal | 120€ | 410€ (4h) | 740€ (8h) |
| Vertical | 120€ | 410€ (4h) | 740€ (8h) |
| Cyclorama | — | 650€ (5h) | 880€ (10h) |
| Visite | Gratuit | — | — |

### Équipe

| Rôle | Tarif |
|------|-------|
| Styliste | 67,50€/h |
| Opérateur machine | 67,50€/h |
| Assistant plateau | 200€/jour |
| Décor | 500€/jour |
| Stylisme | 250€/jour |
| Production | 350€/jour |

## 8. Edge Functions (Async)

### calendar-sync

- Déclenché après création de booking
- Crée un événement iCal et stocke l'UID dans `ical_feeds`
- Endpoint : `POST /functions/v1/calendar-sync`
- Payload : `{ bookingId: string, action: 'create' }`

### send-email

- Envoie les emails de confirmation (client + admin)
- Endpoint : `POST /functions/v1/send-email`
- Payload : `{ type: 'booking', bookingId: string }`

## 9. Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `src/book-page.tsx` | Composant principal du wizard de réservation |
| `src/lib/bookings.ts` | Logique de création (insert DB + triggers async) |
| `src/lib/booking-schema.ts` | Schéma Zod bilingue pour validation contact |
| `src/lib/availability.ts` | Hook React pour calcul de disponibilité |
| `supabase/migrations/20260504000000_booking_tables.sql` | Schéma DB |
| `supabase/migrations/20260504000001_booking_rls.sql` | Politiques RLS |
| `supabase/migrations/20260504000002_booking_indexes.sql` | Index de performance |

## 10. Diagramme de Séquence — Réservation Standard

```
Client                  Frontend              Supabase              Edge Functions
  │                        │                      │                      │
  │── Sélection plateau ──▶│                      │                      │
  │── Config durée/date ──▶│                      │                      │
  │── Remplir contact ────▶│                      │                      │
  │── Submit ─────────────▶│                      │                      │
  │                        │── INSERT bookings ──▶│                      │
  │                        │── INSERT sessions ──▶│                      │
  │                        │── INSERT quotes ────▶│                      │
  │                        │                      │                      │
  │                        │── POST calendar-sync ────────────────────▶│
  │                        │── POST send-email ───────────────────────▶│
  │                        │                      │                      │
  │◀── Confirmation ───────│                      │                      │
  │    (référence EDO-R-…) │                      │                      │
```

## 11. Intégration depuis une App Externe

Pour intégrer le système de réservation dans une autre application (ex: etouch), utiliser directement le client Supabase :

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Vérifier la disponibilité d'un plateau pour un mois
const { data } = await supabase
  .from('bookings')
  .select('preferred_date, booking_sessions!inner(hours)')
  .in('status', ['pending', 'confirmed'])
  .gte('preferred_date', '2026-06-01')
  .lte('preferred_date', '2026-06-30')
  .eq('booking_sessions.plateau_key', 'live');

// 2. Créer une réservation
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    reference: 'EDO-R-' + generateCode(),
    status: 'pending',
    client_name: 'Jean Dupont',
    client_email: 'jean@example.com',
    client_company: 'ACME',
    client_siren: '123456789',
    project_type: 'e-commerce',
    total_estimate: 620,
    preferred_date: '2026-06-15',
    arrival_hour: 9,
  })
  .select()
  .single();

// 3. Ajouter une session
await supabase.from('booking_sessions').insert({
  booking_id: booking.id,
  plateau_key: 'live',
  slot_type: 'half',
  hours: 4,
  quantity: 1,
});

// 4. Ajouter le devis
await supabase.from('booking_quotes').insert({
  booking_id: booking.id,
  reference: booking.reference,
  rows: [{ lbl: 'Plateau Live – Demi-journée', amt: 620 }],
  total: 620,
});
```

### Notes d'intégration

- La clé anonyme Supabase suffit pour INSERT + SELECT (RLS configuré)
- Les Edge Functions (calendar-sync, send-email) ne sont pas déclenchées automatiquement par un INSERT direct — il faut les appeler manuellement si besoin
- Les status possibles : `draft` → `pending` → `confirmed` / `cancelled`
- La référence doit être unique (format : `EDO-R-` + 6 chars alphanumériques, charset : `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
