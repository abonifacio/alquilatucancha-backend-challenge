import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/alquila-tu-cancha.client';
import { HttpService } from '@nestjs/axios';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception';
import { AxiosError } from 'axios';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(HTTPAlquilaTuCanchaClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<Club[]> {
    try {
      const { data: clubs } = await this.httpService.axiosRef.get<Club[]>(`${this.baseUrl}/clubs`, {
        params: { placeId },
      });
  
      return clubs;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`Error fetching clubs for placeId ${placeId}: ${error.message}`, {
          status: error.response?.status,
          data: error.response?.data,
        });

        if (error.response?.status === HttpStatus.TOO_MANY_REQUESTS) {
          throw new TooManyRequestsException();
        }
      }
  
      throw error;
    }
  }

  async getCourts(clubId: number): Promise<Court[]> {
    try {
      const { data: courts } = await this.httpService.axiosRef.get<Court[]>(
        `${this.baseUrl}/clubs/${clubId}/courts`
      );

      return courts;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`Error fetching courts for clubId ${clubId}: ${error.message}`, {
          status: error.response?.status,
          data: error.response?.data,
        });

        if (error.response?.status === HttpStatus.TOO_MANY_REQUESTS) {
          throw new TooManyRequestsException();
        }
      }

      throw error;
    }
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const { data: slots } = await this.httpService.axiosRef.get<Slot[]>(
        `${this.baseUrl}/clubs/${clubId}/courts/${courtId}/slots`,
        {
          params: { date: formattedDate },
        },
      );
  
      return slots;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Error fetching slots for clubId ${clubId}, courtId ${courtId}: ${error.message}`,
          {
            status: error.response?.status,
            data: error.response?.data,
            date: date,
          }
        );
        
        if (error.response?.status === HttpStatus.TOO_MANY_REQUESTS) {
          throw new TooManyRequestsException();
        }
      }

      throw error;
    }
  }
}
