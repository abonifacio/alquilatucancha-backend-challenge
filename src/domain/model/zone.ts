export interface Zone {
  id: number
  name: string
  full_name: string
  placeid: string
  country: Country
}

export interface Country {
  id: number
  name: string
  iso_code: string
}