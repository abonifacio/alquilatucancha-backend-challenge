import { HttpService } from '@nestjs/axios';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';

jest.setTimeout(60_000);

const expectSlotStructure = (slot: any) => {
  expect(slot).toEqual(
    expect.objectContaining({
      _priority: expect.any(Number),
      datetime: expect.any(String),
      duration: expect.any(Number),
      end: expect.any(String),
      price: expect.any(Number),
      start: expect.any(String),
    })
  );
};

const expectCourtStructure = (court: any) => {
  expect(court).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      sports: expect.any(Array),
      available: expect.arrayContaining([
        expect.objectContaining({
          _priority: expect.any(Number),
          datetime: expect.any(String),
          duration: expect.any(Number),
          end: expect.any(String),
          price: expect.any(Number),
          start: expect.any(String),
        })
      ])
    })
  );
};

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

  it('/search?placeId&date (GET)', async () => {
    const date = new Date().toISOString().split('T')[0];
    const placeId = 'ChIJW9fXNZNTtpURV6VYAumGQOw';
    const response = await request(app.getHttpServer())
      .get(`/search?placeId=${placeId}&date=${date}`)
      .expect(200)

    const expected_response = await http.axiosRef.get(
      `http://localhost:4000/test?placeId=${placeId}&date=${date}`,
    );

    expect(Array.isArray(response.body)).toBe(true);
    expect(Array.isArray(expected_response.data)).toBe(true);
    
    expect(response.body.length).toBe(expected_response.data.length);

    response.body.forEach((club: any, index: number) => {
      const expectedClub = expected_response.data[index];
      expect(club.id).toBe(expectedClub.id);
      expect(club.courts.length).toBe(expectedClub.courts.length);
      
      club.courts.forEach((court: any, courtIndex: number) => {
        expectCourtStructure(court);
        court.available.forEach(expectSlotStructure);
      });
    });
  });
});
