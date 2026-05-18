import type { Contact } from "@/types/crm";

export function renderVariables(
  template: string,
  contact: Pick<Contact, "name" | "phone">
): string {
  const firstName = contact.name?.trim().split(/\s+/)[0] ?? "Cliente";
  return template
    .replace(/\{nome\}/gi, contact.name ?? "Cliente")
    .replace(/\{primeiro_nome\}/gi, firstName)
    .replace(/\{telefone\}/gi, contact.phone);
}

export const VARIABLE_BUTTONS = [
  { key: "{nome}", label: "Nome" },
  { key: "{primeiro_nome}", label: "Primeiro nome" },
  { key: "{telefone}", label: "Telefone" },
] as const;
