export class DanteBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class MathPrecisionError extends DanteBaseError {}
export class GuardrailViolationError extends DanteBaseError {}
export class ConfigurationError extends DanteBaseError {}
export class DocumentNotFoundError extends DanteBaseError {}
