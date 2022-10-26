export interface Court {
  id: number;
  name: string;
  attributes: Attributes;
  sports: Sport[];
}

export interface Attributes {
  floor: string;
  light: boolean;
  roofed: boolean;
  beelup: boolean;
}

export interface Sport {
  id: number;
  parent_id: number;
  name: string;
  players_max: number;
  order: number;
  default_duration: number;
  divisible_duration: number;
  icon: string;
  pivot: Pivot;
}

export interface Pivot {
  court_id: number;
  sport_id: number;
  enabled: number;
}
