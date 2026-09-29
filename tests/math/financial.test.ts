import { FinancialMath } from '../../src/math/financial';
import { MathPrecisionError } from '../../src/errors/DanteErrors';

describe('FinancialMath - Protocolo APP-Ω', () => {
  it('Debe calcular IVA normal y redondeos exactos', () => {
    // 1000000 * 0.19 = 190000
    // 500000 * 0.19 = 95000
    // Diferencia: 95000
    const iva = FinancialMath.calculateIVA(1000000, 500000, 0, { ivaRate: "0.19" });
    expect(iva.saldoAPagarCLP).toBe(95000);
    expect(iva.remanenteAcumulableCLP).toBe(0);
  });

  it('Debe calcular IVA con remanente que supera el débito', () => {
    const iva = FinancialMath.calculateIVA(1000000, 500000, 100000, { ivaRate: "0.19" });
    // 190000 - 95000 - 100000 = -5000
    expect(iva.saldoAPagarCLP).toBe(0);
    expect(iva.remanenteAcumulableCLP).toBe(5000);
  });

  it('Debe fallar si los CLP no son enteros', () => {
    expect(() => {
      FinancialMath.calculateIVA(1000000.5, 500000, 0, { ivaRate: "0.19" });
    }).toThrow(MathPrecisionError);
  });

  it('Debe convertir UF a CLP conservando precisión y redondeando a entero', () => {
    // UF = 37985.45, cantidad = 10.5
    // 37985.45 * 10.5 = 398847.225 -> round -> 398847
    const clp = FinancialMath.convertUFtoCLP("37985.45", "10.5");
    expect(clp).toBe(398847);
  });

  it('Debe lanzar error con UF invalida', () => {
    expect(() => {
      FinancialMath.convertUFtoCLP("invalido", "10.5");
    }).toThrow(MathPrecisionError);
  });

  it('Comprueba semáforo Pascal de caja en rojo', () => {
    const result = FinancialMath.checkPascalReserve(2000000, 900000);
    // Reserva minima = 1000000
    expect(result.reservaMinima15DiasCLP).toBe(1000000);
    expect(result.semaforoSolvencia).toBe('ROJO_BLOQUEO_TOTAL');
    expect(result.accionAutorizada).toBe(false);
  });

  it('Comprueba semáforo Pascal de caja en verde', () => {
    const result = FinancialMath.checkPascalReserve(2000000, 1000000);
    expect(result.semaforoSolvencia).toBe('VERDE');
    expect(result.accionAutorizada).toBe(true);
  });
});
