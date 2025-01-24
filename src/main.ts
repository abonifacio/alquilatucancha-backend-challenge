import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './infrastructure/exceptions/http.exception';
import { ErrorInterceptor } from './infrastructure/interceptors/error.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // Active filters & interceptors
  app.useGlobalInterceptors(new ErrorInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
