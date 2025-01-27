import { BadRequestException } from '@nestjs/common';
import * as moment from 'moment';

interface ValidateDateOptions {
  expirationDays: number;
  errorMessage?: string;
}

export function validateDate(date: Date, options: ValidateDateOptions) {
  const currentDate = getCurrentDate();
  const expirationDate = addDaysToDate(currentDate, options.expirationDays);

  if (moment(date).isBefore(currentDate) || moment(date).isAfter(expirationDate)) {
    throw new BadRequestException(
      options.errorMessage || 
      `Date must be between today and ${options.expirationDays} days from now`
    );
  }
}

function getCurrentDate(): Date {
  return moment().startOf('day').toDate();
}

function addDaysToDate(date: Date, days: number): Date {
  return moment(date).add(days, 'days').toDate();
}
