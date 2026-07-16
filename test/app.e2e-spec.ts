import { HttpService } from '@nestjs/axios';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';

jest.setTimeout(60_000);

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let http: HttpService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication(
      new FastifyAdapter({ logger: true }),
    );
    http = app.get(HttpService);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/search?placeId=ChIJW9fXNZNTtpURV6VYAumGQOw&date=2022-08-19 (GET)', async () => {
    const date = '2022-08-19';
    const placeId = 'ChIJW9fXNZNTtpURV6VYAumGQOw';
    const response = await request(app.getHttpServer())
      .get(`/search?placeId=${placeId}&date=${date}`)
      .expect(200);

    const expected_response = await http.axiosRef.get(
            `${process.env.ATC_BASE_URL}/test?placeId=${placeId}&date=${date}`,
    );

    expect(response.body).toEqual(expected_response.data);
  });
});
