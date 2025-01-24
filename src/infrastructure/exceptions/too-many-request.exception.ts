import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(message = 'Too Many Requests') {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
