import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type BookingData,
  renderStatusChangeAdmin,
  renderStatusChangeClient,
  statusChangeAdminLabel,
  statusChangeSubject,
} from "./renderers.ts";

const booking: BookingData = {
  reference: "EDO-R-0042",
  client_name: "Marie Dubois",
  client_email: "marie.dubois@example.com",
  client_phone: null,
  client_company: "Studio Ligne Claire",
  client_siren: null,
  project_type: null,
  urgency: null,
  total_estimate: 450,
  preferred_date: "2026-11-20",
  arrival_hour: 9,
  notes: null,
};

Deno.test("a cancelled booking reads « annulée », never « non retenue »", () => {
  assertEquals(statusChangeSubject("rejet", "EDO-R-0042"), "Réservation annulée — EDO-R-0042 — E-Do Studio");
  assertEquals(statusChangeAdminLabel("rejet"), "Réservation annulée");

  const client = renderStatusChangeClient(booking, [], null, "rejet", null, null);
  assert(client.includes("Réservation annulée"));
  assert(client.includes("La réservation EDO-R-0042 a été annulée."));
  assert(!client.includes("non retenue"));

  const admin = renderStatusChangeAdmin(booking, [], null, "rejet", null, null);
  assert(admin.includes("Réservation annulée"));
  assert(!admin.includes("non retenue"));
});

Deno.test("the other status changes keep their wording", () => {
  assertEquals(statusChangeSubject("report", "EDO-R-0042"), "Réservation EDO-R-0042 reportée — E-Do Studio");
  const client = renderStatusChangeClient(booking, [], null, "report", "2026-11-27", null);
  assert(client.includes("Votre réservation a été reportée à une nouvelle date."));
});
