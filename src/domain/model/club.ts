export interface Club {
  id: number;
  permalink: string;
  name: string;
  logo: string;
  logo_url: string;
  background: string;
  background_url: string;
  location: Location;
  zone: Zone;
  props: Props;
  attributes: string[];
  openhours: Openhour[];
  _priority: number;
}

export interface Location {
  name: string;
  city: string;
  lat: string;
  lng: string;
}

export interface Zone {
  id: number;
  name: string;
  full_name: string;
  placeid: string;
  country: Country;
}

export interface Country {
  id: number;
  name: string;
  iso_code: string;
}

export interface Props {
  sponsor: boolean;
  favorite: boolean;
  stars: string;
  payment: boolean;
}

export interface Openhour {
  day_of_week: number;
  open_time: number;
  close_time: number;
  open: boolean;
}
