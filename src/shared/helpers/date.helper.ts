import * as moment from 'moment';

export function _addDaysToDate(date: Date, days: number): Date {
  return moment(date).add(days, 'days').toDate();
}

export function _getCurrentDate() {
  return moment().toDate();
}

export function _setDate(date: string): Date {
  return moment(date).toDate();
}

export function _formatDate(date: Date, format: string): string {
  return moment(date).format(format);
}
