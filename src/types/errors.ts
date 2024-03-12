export class ServerError extends Error {
  errCode: string | number;
  httpCode: number;
  data?: any;
  constructor(
    message: string,
    httpCode: number,
    errCode: string | number,
    data?: any
  ) {
    super(message);
    this.errCode = errCode;
    this.httpCode = httpCode;
    this.data = data;
  }
  toJSON() {
    return {
      message: this.message,
      httpCode: this.httpCode,
      errCode: this.errCode,
      data: this.data,
    };
  }
}
