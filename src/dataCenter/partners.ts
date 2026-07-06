export type PartnerStatus = 'Active' | 'Inactive' | 'Pending'

export interface Partner {
  id:       string
  name:     string
  type:     string
  region:   string
  contact:  string
  email:    string
  status:   PartnerStatus
  since:    string
}

export const PARTNERS: Partner[] = [
  { id: 'p-001', name: 'Fidelity Bank Ghana',     type: 'Commercial Bank',  region: 'Greater Accra', contact: 'Kwame Mensah',   email: 'kwame.m@fidelitybank.gh',    status: 'Active',   since: '2024-01' },
  { id: 'p-002', name: 'Agricultural DFI',         type: 'Development Bank', region: 'National',      contact: 'Akosua Asante',  email: 'a.asante@agridfi.gov.gh',    status: 'Active',   since: '2023-06' },
  { id: 'p-003', name: 'Ghana Rural Bank',         type: 'Rural Bank',       region: 'Ashanti',       contact: 'Kofi Adjei',     email: 'k.adjei@ghanaruralbank.com', status: 'Active',   since: '2024-03' },
  { id: 'p-004', name: 'USAID Feed the Future',    type: 'NGO / Donor',      region: 'Northern',      contact: 'Sarah Williams', email: 's.williams@usaid.gov',       status: 'Active',   since: '2023-09' },
  { id: 'p-005', name: 'Opportunity Intl. Ghana',  type: 'MFI',              region: 'Upper East',    contact: 'Ama Boateng',    email: 'a.boateng@opportunity.org',  status: 'Active',   since: '2024-02' },
  { id: 'p-006', name: 'Stanbic Bank Ghana',       type: 'Commercial Bank',  region: 'Greater Accra', contact: 'Emmanuel Ofori', email: 'e.ofori@stanbic.com.gh',     status: 'Pending',  since: '2025-01' },
  { id: 'p-007', name: 'CARE International Ghana', type: 'NGO / Donor',      region: 'Brong Ahafo',   contact: 'Diana Asare',    email: 'd.asare@care.org',           status: 'Active',   since: '2023-11' },
  { id: 'p-008', name: 'Sinapi Aba Trust',         type: 'MFI',              region: 'Kumasi',        contact: 'Peter Yeboah',   email: 'p.yeboah@sinapiaba.com',     status: 'Inactive', since: '2023-04' },
]
