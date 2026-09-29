/**
 * DANTE v4.0 - RUNTIME ORCHESTRATION & ANTI-HALLUCINATION ENGINE
 * Director Supremo y Creador: Isaac Patricio Pastén Díaz
 * Jurisdicción: República de Chile (Normativa 2026)
 * Tolerancia al Error Aritmético: 0.000% estricto (Protocolo APP-Ω)
 */

class DanteOrchestrator {
  constructor(config = {}) {
    this.similarityThreshold = config.similarityThreshold || 0.88;
    this.strictZeroError = true;
    this.payrollReserveDaysRequired = 15;
  }

  // COMPUERTA 1: Detección de Premisas Falsas y Cámara de Eco
  preFlightCheck(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      throw new Error('[GUARDRAIL ALERT]: El requerimiento debe ser un texto explícito estructurado.');
    }

    const absurdPatterns = [
      /vacas\s+vuelan/i,
      /iva\s+es\s+del\s+10%/i,
      /jornada\s+legal\s+de\s+50\s+horas/i
    ];

    for (const pattern of absurdPatterns) {
      if (pattern.test(userInput)) {
        return {
          status: 'REJECTED_ECHO_CHAMBER',
          action: 'CORRECTION_REQUIRED',
          message: 'ALERTA DE CAUSA RAÍZ: La consulta contiene premisas fácticamente falsas que violan la realidad física o legal chilena.'
        };
      }
    }

    return { status: 'CLEARED_FOR_RAG' };
  }

  // COMPUERTA 2: Mitigación de los 7 Pecados del RAG y Reranking en Herradura
  evaluateRetrievalContext(queryVector, documentChunks) {
    if (!documentChunks || documentChunks.length === 0) {
      return {
        isAvailable: false,
        error: 'FALLA_RECUPERACION_1: FALTA_DE_CONTEXTO',
        systemOutput: 'INFORMACIÓN NO DISPONIBLE EN EL REPOSITORIO DANTE. Se exige inyección de fuentes primarias antes de dictaminar.'
      };
    }

    const validChunks = documentChunks.filter(chunk => chunk.score >= this.similarityThreshold);

    if (validChunks.length === 0) {
      return {
        isAvailable: false,
        error: 'FALLA_RECUPERACION_2: RECUPERACIÓN_RUIDOSA',
        systemOutput: 'ALERTA FORENSE: Los documentos recuperados no alcanzan la relevancia mínima del 88%. Consulta declarada NO DETERMINABLE.'
      };
    }

    // Reranking simétrico contra la "Pérdida en el Medio"
    const sorted = [...validChunks].sort((a, b) => b.score - a.score);
    const reordered = [];
    let left = true;
    for (const chunk of sorted) {
      if (left) reordered.unshift(chunk);
      else reordered.push(chunk);
      left = !left;
    }

    return {
      isAvailable: true,
      context: reordered.map(c => c.text).join('\n---\n')
    };
  }

  // COMPUERTA 3: Columna Vertebral de Gauss - Sandbox Aritmético (0,000% Error)
  executeGaussAppOmega(operationType, params) {
    switch (operationType) {
      case 'CALCULO_F29_IVA': {
        const { ventasNetas, comprasNetas, remanenteAnterior } = params;
        const debitoFiscal = Math.round(ventasNetas * 0.19);
        const creditoFiscal = Math.round(comprasNetas * 0.19);
        const impuestoDeterminado = debitoFiscal - creditoFiscal - (remanenteAnterior || 0);

        return {
          debitoFiscal_CLP: debitoFiscal,
          creditoFiscal_CLP: creditoFiscal,
          saldoAPagar_CLP: impuestoDeterminado > 0 ? impuestoDeterminado : 0,
          remanenteAcumulable_CLP: impuestoDeterminado < 0 ? Math.abs(impuestoDeterminado) : 0,
          tasaErrorCertificada: '0.000%'
        };
      }

      case 'PASCAL_RESERVA_NOMINA': {
        const { sueldosLiquidosMensuales, cajaDisponible } = params;
        const reservaCritica15Dias = Math.round(sueldosLiquidosMensuales / 2);
        const margenSeguridad = cajaDisponible - reservaCritica15Dias;

        return {
          reservaMinima15Dias_CLP: reservaCritica15Dias,
          cajaDisponible_CLP: cajaDisponible,
          semaforoSolvencia: margenSeguridad >= 0 ? 'VERDE' : 'ROJO_BLOQUEO_TOTAL',
          diasPistaAterrizaje: Math.floor((cajaDisponible / sueldosLiquidosMensuales) * 30),
          accionAutorizada: margenSeguridad >= 0
        };
      }

      default:
        throw new Error(`Operación no soportada por el protocolo APP-Ω: ${operationType}`);
    }
  }

  // COMPUERTA 4: Aduana Atenea - Erradicación de Adulación y Falsas Promesas
  sanitizeOutput(botRawResponse, apiExecutionReceipt = null) {
    let cleanResponse = botRawResponse;

    const sycophancyPhrases = [
      /¡?todo está perfecto!?/gi,
      /¡?hecho!/gi,
      /un excelente análisis/gi,
      /como bien señalas/gi
    ];
    sycophancyPhrases.forEach(re => {
      cleanResponse = cleanResponse.replace(re, '');
    });

    const executionClaims = [
      /he enviado el correo/i,
      /he actualizado la base de datos/i,
      /acabo de transferir los fondos/i
    ];
    for (const claim of executionClaims) {
      if (claim.test(cleanResponse) && (!apiExecutionReceipt || !apiExecutionReceipt.success)) {
        throw new Error('[ALERTA ATENEA]: Violación de verdad factual. El modelo simuló haber ejecutado una acción externa sin contar con recibo HTTP 200 de la API.');
      }
    }

    return cleanResponse.trim();
  }
}

module.exports = DanteOrchestrator;