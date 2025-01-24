import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TooManyRequestsException } from '../exceptions/too-many-request.exception';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof HttpException) return next.handle();
        // Intercept Too Many Request exceptions
        else if (error?.response?.status === 429)
          throw new TooManyRequestsException('Rate limit exceeded');

        throw new InternalServerErrorException(
          error?.message || 'Internal server error',
        );
      }),
    );
  }
}
