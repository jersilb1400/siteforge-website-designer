// Typed application errors. Routes throw these; the global error handler in
// src/index.ts turns them into consistent JSON responses. This keeps route
// code readable (`throw new NotFound('project')`) and responses uniform.

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: unknown;

  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export class BadRequest extends AppError {
  constructor(message: string, detail?: unknown) {
    super(400, 'bad_request', message, detail);
  }
}

export class Unauthorized extends AppError {
  constructor(message = 'Authentication required.') {
    super(401, 'unauthorized', message);
  }
}

export class NotFound extends AppError {
  constructor(resource: string) {
    super(404, 'not_found', `${resource} not found.`);
  }
}

export class Conflict extends AppError {
  constructor(message: string) {
    super(409, 'conflict', message);
  }
}

export class UpstreamError extends AppError {
  constructor(message: string, detail?: unknown) {
    super(502, 'upstream_error', message, detail);
  }
}
