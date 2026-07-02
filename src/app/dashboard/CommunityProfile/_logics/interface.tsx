export type SocioeconomicStatus = 'rural' | 'urban' | 'peri_urban'

export interface AmenityEntry {
  present:  boolean | null
  quantity: number | null
  comment:  string | null
}

export interface SocialAmenities {
  schools:   AmenityEntry
  hospital:  AmenityEntry
  police:    AmenityEntry
  water:     AmenityEntry
  financial: AmenityEntry
  road:      AmenityEntry
  network:   AmenityEntry
}

export interface Community {
  id:                  string
  name:                string
  regionCode:          string
  regionName:          string
  district:            string
  nearestTown:         string | null
  socioeconomicStatus: SocioeconomicStatus | null
  incomeStreams:       string[]
  incomeStreamsOther:  string | null
  socialAmenities:     SocialAmenities
  gpsLat:              number | null
  gpsLng:              number | null
  leaderName:          string | null
  leaderContact:       string | null
  imageUrl:            string | null
  createdAt:           string
}

export interface Cooperative {
  id:             string
  name:           string
  communityId:    string | null
  communityName:  string | null
  communityRegion:string | null
  memberCount:    number
  primaryCrops:   string[]
  secondaryCrops: string[]
  farmAnimals:    string[]
  chairmanName:   string | null
  secretaryName:  string | null
  createdAt:      string
}

export interface RegionOption {
  code:      string
  name:      string
  districts: string[]
}
