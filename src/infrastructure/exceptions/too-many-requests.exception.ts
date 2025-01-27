import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(message?: string, cause?: any) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: message ?? 'Too Many Requests',
        error: 'Too Many Requests',
        cause,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
