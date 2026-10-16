// === ADDED: spec 003 — entity types covered by the status audit log ===
// The read endpoint accepts only these values (ParseEnumPipe), so it cannot be used to
// read the WASH / Recovery / Winterization logs that share the same table.
export enum AuditedEntityType {
  PROCUREMENT = 'procurement',
  VACANCY = 'vacancy',
  TESTIMONIAL = 'testimonial',
  COMPLAINT = 'complaint',
  INQUIRY = 'inquiry',
}
