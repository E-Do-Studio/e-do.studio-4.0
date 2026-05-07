// Local preview / smoke test for the booking emails.
// Run with: deno run --allow-write --allow-env supabase/functions/send-email/preview.ts
//
// Generates HTML files under ./.preview/ and a sample .ics so you can:
//   - open them in a browser to eyeball the redesign
//   - import the .ics into Google Calendar / Apple Calendar to confirm it parses

import { buildBookingIcs, type IcalBookingRow, type IcalSessionRow } from "../_shared/ical.ts";

// We can't import the email index directly because it calls Deno.serve at top
// level. Inline the same fixtures into copies of the renderers via re-import
// pattern: spin up a minimal mock and call exported helpers if any. Since
// index.ts doesn't export them, we duplicate the fixtures and call HTTP later
// — for now we only render via the public functions exported here.

import {
  renderBookingClient,
  renderBookingAdmin,
  renderStatusChangeClient,
  renderStatusChangeAdmin,
  renderContactAdmin,
  renderContactClient,
} from "./renderers.ts";

const sampleBooking = {
  reference: "EDO-R-58YSYT",
  client_name: "test test",
  client_email: "theo.daguier@icloud.com",
  client_phone: "0656678583",
  client_company: "Test",
  client_siren: "123456789",
  project_type: "ecom",
  urgency: "flex",
  total_estimate: 187.5,
  preferred_date: "2026-05-08",
  arrival_hour: 13,
  notes: null,
};

const sampleSessions = [
  {
    plateau_key: "vertical",
    slot_type: "hour",
    hours: 1,
    cyclo_mode: null,
    product_type: "ecom",
    method: "packshot",
    submethod: "pique",
    quantity: 3,
    media: null,
    views: ["face"],
    views_count: 0,
    postprod_enabled: false,
    postprod_video: false,
  },
];

const sampleQuote = {
  reference: "EDO-Q-R6PKBF",
  rows: [
    { lbl: "Vertical · 1h", amt: 120 },
    { lbl: "Styliste · 1 × 1h", amt: 67.5 },
    { lbl: "Assistant plateau · Sur demande", amt: 0, onReq: true },
    { lbl: "Assistant set design · Sur demande", amt: 0, onReq: true },
  ],
  total: 187.5,
};

await Deno.mkdir("./.preview", { recursive: true });

await Deno.writeTextFile(
  "./.preview/booking-client.html",
  renderBookingClient(sampleBooking, sampleSessions, sampleQuote),
);
await Deno.writeTextFile(
  "./.preview/booking-admin.html",
  renderBookingAdmin(sampleBooking, sampleSessions, sampleQuote),
);
await Deno.writeTextFile(
  "./.preview/status-report-client.html",
  renderStatusChangeClient(sampleBooking, sampleSessions, sampleQuote, "report", "2026-05-22", "Nous décalons d'une semaine pour mieux vous accueillir."),
);
await Deno.writeTextFile(
  "./.preview/status-report-admin.html",
  renderStatusChangeAdmin(sampleBooking, sampleSessions, sampleQuote, "report", "2026-05-22", "Nous décalons d'une semaine pour mieux vous accueillir."),
);
await Deno.writeTextFile(
  "./.preview/contact-client.html",
  renderContactClient("Thomas", "Demande de devis"),
);
await Deno.writeTextFile(
  "./.preview/contact-admin.html",
  renderContactAdmin("Thomas", "thomas@example.com", "0612345678", "Acme", "Demande de devis", "Bonjour, je souhaite un devis pour 4h en plateau vertical, méthode packshot.\n\nMerci."),
);

const icsBookingRow: IcalBookingRow = {
  id: "00000000-0000-0000-0000-000000000001",
  reference: sampleBooking.reference,
  status: "pending",
  client_name: sampleBooking.client_name,
  client_email: sampleBooking.client_email,
  client_phone: sampleBooking.client_phone,
  client_company: sampleBooking.client_company,
  client_siren: sampleBooking.client_siren,
  project_type: sampleBooking.project_type,
  urgency: sampleBooking.urgency,
  preferred_date: sampleBooking.preferred_date,
  arrival_hour: sampleBooking.arrival_hour,
  total_estimate: sampleBooking.total_estimate,
  notes: sampleBooking.notes,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ics = buildBookingIcs(
  icsBookingRow,
  sampleSessions as unknown as IcalSessionRow[],
  sampleQuote.rows,
  sampleQuote.total,
);
await Deno.writeTextFile("./.preview/booking.ics", ics);

console.log("Wrote previews to ./.preview/");
console.log("  - booking-client.html");
console.log("  - booking-admin.html");
console.log("  - status-report-client.html");
console.log("  - status-report-admin.html");
console.log("  - contact-client.html");
console.log("  - contact-admin.html");
console.log("  - booking.ics");
