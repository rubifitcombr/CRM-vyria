/** Nome fixo da instância Evolution dedicada ao Vyria CRM (isolada do Delivery/outros). */
export const CRM_EVOLUTION_INSTANCE = "vyria_crm";

export function isCrmEvolutionInstance(name: string): boolean {
  return name === CRM_EVOLUTION_INSTANCE || name.startsWith("vyria_crm_");
}
