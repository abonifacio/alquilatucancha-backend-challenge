import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Club } from 'src/domain/model/club';

import { HTTPAlquilaTuCanchaClient } from './http-alquila-tu-cancha.client';

jest.mock('@nestjs/axios');

describe('HTTPAlquilaTuCanchaClient', () => {
  let client: HTTPAlquilaTuCanchaClient;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HTTPAlquilaTuCanchaClient,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              defaults: {
                timeout: 0,
              },
              get: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    client = module.get<HTTPAlquilaTuCanchaClient>(HTTPAlquilaTuCanchaClient);
    httpService = module.get(HttpService);
  });

  describe('getClubs', () => {
    it('should return clubs when placeId is valid', async () => {
      const placeId = '123';
      const clubs: Club[] = [{ id: 1 }, { id: 2 }];
      const mockResponse = {
        data: clubs,
        status: 200,
        statusText: 'ok',
        headers: {},
        config: {},
      };

      httpService.axiosRef.get = jest.fn().mockResolvedValue(mockResponse);

      const response = await client.getClubs(placeId);
      expect(response).toEqual(clubs);
      expect(httpService.axiosRef.get).toHaveBeenCalledWith('/clubs', {
        params: { placeId: placeId },
      });
    });

    it('should throw BadRequestException when placeId is invalid', async () => {
      await expect(client.getClubs('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCourts', () => {
    it('should return courts when clubId is valid', async () => {
      const clubId = 1;
      const courts = [{ id: 1, name: 'Cancha 1' }];
      const mockResponse = {
        data: courts,
        status: 200,
        statusText: 'ok',
        headers: {},
        config: {},
      };

      httpService.axiosRef.get = jest.fn().mockResolvedValue(mockResponse);

      const response = await client.getCourts(clubId);

      expect(response).toEqual(courts);
      expect(httpService.axiosRef.get).toHaveBeenCalledWith(
        `/clubs/${clubId}/courts`,
        {
          params: {},
        },
      );
    });

    it('should throw BadRequestException when clubId is invalid', async () => {
      await expect(client.getCourts(0)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSlots', () => {
    it('should return slots when clubId and courtId are valid', async () => {
      const clubId = 1;
      const courtId = 1;
      const mockResponse = {
        data: [],
        status: 200,
        statusText: 'ok',
        headers: {},
        config: {},
      };

      httpService.axiosRef.get = jest.fn().mockResolvedValue(mockResponse);

      const response = await client.getAvailableSlots(
        clubId,
        courtId,
        new Date(),
      );

      expect(response).toEqual([]);
      expect(httpService.axiosRef.get).toHaveBeenCalledWith(
        `/clubs/${clubId}/courts/${courtId}/slots`,
        {
          params: {
            date: expect.any(String),
          },
        },
      );
    });

    it('should throw BadRequestException when clubId or courtId are invalid', async () => {
      await expect(client.getAvailableSlots(0, 0, new Date())).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
