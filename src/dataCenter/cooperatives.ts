export type CooperativeStatus = 'Active' | 'Inactive' | 'Dormant'

export interface Cooperative {
  id:            string
  name:          string
  communityName: string
  region:        string
  district:      string
  memberCount:   number
  primaryCrops:  string[]
  chairmanName:  string
  secretaryName: string
  status:        CooperativeStatus
  since:         string
}

export const COOPERATIVES: Cooperative[] = [
  { id: 'coop-001', name: 'Kumasi Central Cooperative',    communityName: 'Kumasi Metro',    region: 'Ashanti',       district: 'Kumasi Metropolitan',   memberCount: 142, primaryCrops: ['Cocoa', 'Maize'],   chairmanName: 'Ama Mensah',      secretaryName: 'Ama Konadu',      status: 'Active',   since: '2021-03' },
  { id: 'coop-002', name: 'Northern Farmers Union',        communityName: 'Tamale East',      region: 'Northern',      district: 'Tamale Metropolitan',   memberCount: 98,  primaryCrops: ['Rice', 'Soybean'],  chairmanName: 'Alhassan Mahama', secretaryName: 'Fati Iddrisu',    status: 'Active',   since: '2020-07' },
  { id: 'coop-003', name: 'Volta Delta Growers',           communityName: 'Sogakope',         region: 'Volta',         district: 'South Tongu',           memberCount: 64,  primaryCrops: ['Rice', 'Vegetables'], chairmanName: 'Selorm Agbeko', secretaryName: 'Abla Kudjoe',   status: 'Active',   since: '2022-01' },
  { id: 'coop-004', name: 'Brong Ahafo Smallholders',      communityName: 'Sunyani West',     region: 'Brong Ahafo',   district: 'Sunyani Municipal',      memberCount: 121, primaryCrops: ['Cocoa', 'Cashew'],  chairmanName: 'Yaw Boadi',       secretaryName: 'Akosua Frimpong', status: 'Active',   since: '2019-11' },
  { id: 'coop-005', name: 'Upper East Grain Alliance',     communityName: 'Bolgatanga',       region: 'Upper East',    district: 'Bolgatanga Municipal',  memberCount: 76,  primaryCrops: ['Millet', 'Groundnut'], chairmanName: 'Adongo Atia',  secretaryName: 'Awine Azumah',   status: 'Dormant',  since: '2020-04' },
  { id: 'coop-006', name: 'Eastern Region Cocoa Growers',  communityName: 'Koforidua',        region: 'Eastern',       district: 'New Juaben South',      memberCount: 156, primaryCrops: ['Cocoa'],            chairmanName: 'Nana Osei',       secretaryName: 'Comfort Asante', status: 'Active',   since: '2018-09' },
  { id: 'coop-007', name: 'Western Palm Producers',        communityName: 'Tarkwa',           region: 'Western',       district: 'Tarkwa-Nsuaem',         memberCount: 53,  primaryCrops: ['Oil Palm'],          chairmanName: 'Kojo Mensah',     secretaryName: 'Adwoa Sarpong',  status: 'Inactive', since: '2021-06' },
]
