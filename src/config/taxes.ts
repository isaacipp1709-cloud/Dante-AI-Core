export interface TaxConfig {
  ivaRate: string; // Representado en string para inyección a decimal.js, ej: "0.19"
}

export const defaultTaxes: TaxConfig = {
  ivaRate: "0.19",
};
