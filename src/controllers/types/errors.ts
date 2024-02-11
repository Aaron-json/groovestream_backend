interface BaseError extends Error {
  code: number;
}
interface BaseErrorConstructor {
  new (message: string, code: number): BaseError;
}
interface ResourceNotFound extends BaseError {
  data: any;
  code: 404;
}
interface BadRequest extends BaseError {
  resource: string;
  code: 400;
}
export interface ServerError extends BaseError {
  code: number;
}
