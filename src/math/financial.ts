import Decimal from 'decimal.js';
import { MathPrecisionError } from '../errors/DanteErrors';
import { TaxConfig } from '../config/taxes';

export interface IVACalculation {
  debitoFiscalCLP: number;
  creditoFiscalCLP: number;
  saldoAPagarCLP: number;
  remanenteAcumulableCLP: number;
}

export interface PascalReserveResult {
  reservaMinima15DiasCLP: number;
  cajaDisponibleCLP: number;
  semaforoSolvencia: 'VERDE' | 'ROJO_BLOQUEO_TOTAL';
  diasPistaAterrizaje: number;
  accionAutorizada: boolean;
}

export class FinancialMath {
  static calculateIVA(
    ventasNetasCLP: number | bigint,
    comprasNetasCLP: number | bigint,
    remanenteAnteriorCLP: number | bigint = 0,
    taxConfig: TaxConfig
  ): IVACalculation {
    if (!Number.isInteger(Number(ventasNetasCLP)) || !Number.isInteger(Number(comprasNetasCLP))) {
      throw new MathPrecisionError("Los montos CLP deben ser enteros.");
    }

    const ventas = new Decimal(ventasNetasCLP.toString());
    const compras = new Decimal(comprasNetasCLP.toString());
    const remanente = new Decimal(remanenteAnteriorCLP.toString());
    
    const ivaRate = new Decimal(taxConfig.ivaRate);

    const debitoFiscal = ventas.times(ivaRate).round();
    const creditoFiscal = compras.times(ivaRate).round();
    
    const impuestoDeterminado = debitoFiscal.minus(creditoFiscal).minus(remanente);

    return {
      debitoFiscalCLP: debitoFiscal.toNumber(),
      creditoFiscalCLP: creditoFiscal.toNumber(),
      saldoAPagarCLP: impuestoDeterminado.greaterThan(0) ? impuestoDeterminado.toNumber() : 0,
      remanenteAcumulableCLP: impuestoDeterminado.lessThan(0) ? impuestoDeterminado.absoluteValue().toNumber() : 0,
    };
  }

  static checkPascalReserve(sueldosLiquidosMensualesCLP: number | bigint, cajaDisponibleCLP: number | bigint): PascalReserveResult {
    const sueldos = new Decimal(sueldosLiquidosMensualesCLP.toString());
    const caja = new Decimal(cajaDisponibleCLP.toString());

    const reservaCritica = sueldos.dividedBy(2).round();
    const margenSeguridad = caja.minus(reservaCritica);

    let diasPista = new Decimal(0);
    if (sueldos.greaterThan(0)) {
       diasPista = caja.dividedBy(sueldos).times(30).floor();
    }

    return {
      reservaMinima15DiasCLP: reservaCritica.toNumber(),
      cajaDisponibleCLP: caja.toNumber(),
      semaforoSolvencia: margenSeguridad.greaterThanOrEqualTo(0) ? 'VERDE' : 'ROJO_BLOQUEO_TOTAL',
      diasPistaAterrizaje: diasPista.toNumber(),
      accionAutorizada: margenSeguridad.greaterThanOrEqualTo(0)
    };
  }

  static convertUFtoCLP(valorUF: string, cantidadUF: string): number {
    try {
      const uf = new Decimal(valorUF);
      const cantidad = new Decimal(cantidadUF);
      return uf.times(cantidad).round().toNumber();
    } catch (e: any) {
      throw new MathPrecisionError("UF value or quantity is invalid.");
    }
  }
}
