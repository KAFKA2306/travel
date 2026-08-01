export type PlaceKind = 'stay' | 'nature' | 'transport' | 'culture' | 'food'

export type Source = {
  id: string
  label: string
  publisher: string
  url: string
  retrievedAt: string
  kind: 'official' | 'standard' | 'climate'
}

export type Place = {
  id: string
  name: string
  eyebrow: string
  kind: PlaceKind
  area: string
  description: string
  tags: string[]
  priceLabel?: string
  rating?: number
  confidence: 'verified' | 'watch' | 'sample'
  sourceIds: string[]
  map: { x: number; y: number }
  accent: 'blue' | 'lilac' | 'mint' | 'rose' | 'apricot'
}

export type ItineraryItem = {
  id: string
  day: number
  time: string
  title: string
  meta: string
  mode: 'flight' | 'ferry' | 'bus' | 'stay' | 'walk'
  status: 'fixed' | 'check' | 'flex'
  placeId?: string
  sourceIds: string[]
}

export type OntologyGroup = {
  name: string
  color: Place['accent']
  description: string
  entities: string[]
  connectsTo: string[]
}
