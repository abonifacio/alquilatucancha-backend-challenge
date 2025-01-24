import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception?.getStatus();
    const exceptionError = exception?.getResponse() as {
      message: string;
      error: string;
    };

    response.status(status).send({
      error: exceptionError?.error,
      statusCode: status,
      message: exceptionError?.message || exception?.message,
      path: request.url,
    });
  }
}
