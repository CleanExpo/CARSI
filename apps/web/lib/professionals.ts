/**
 * lib/professionals.ts
 * Data layer for the Professional Directory.
 *
 * Currently returns static stub data (Track B — UNI-87).
 * When NRPG credentials arrive, swap the function body to a DB query
 * against the `professionals` table — no page changes required.
 */

export interface Professional {
  id: string;
  name: string;
  business_name: string;
  certifications: string[];
  industries: string[];
  service_areas: string[];
  location_city: string;
  location_state: string;
  nrpg_membership_tier: 'associate' | 'member' | 'senior_member' | 'fellow';
  nrpg_membership_status: 'active' | 'inactive' | 'suspended';
  nrpg_member_id: string;
  nrpg_synced_at: string | null;
}

const STUB_PROFESSIONALS: Professional[] = [
  {
    id: 'stub-001',
    name: 'Sarah Mitchell',
    business_name: 'Mitchell Water Restoration',
    certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC FSRT'],
    industries: ['Water Damage', 'Structural Drying', 'Fire & Smoke'],
    service_areas: ['Brisbane', 'Ipswich', 'Logan', 'Redlands'],
    location_city: 'Brisbane',
    location_state: 'QLD',
    nrpg_membership_tier: 'senior_member',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-SM-00142',
    nrpg_synced_at: null,
  },
  {
    id: 'stub-002',
    name: "James O'Connor",
    business_name: "O'Connor Fire & Smoke Specialists",
    certifications: ['IICRC FSRT', 'IICRC OSHA', 'IICRC UFT'],
    industries: ['Fire & Smoke', 'Contents Restoration', 'Odour Control'],
    service_areas: ['Sydney', 'Parramatta', 'Penrith', 'Liverpool'],
    location_city: 'Sydney',
    location_state: 'NSW',
    nrpg_membership_tier: 'fellow',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-FL-00058',
    nrpg_synced_at: null,
  },
  {
    id: 'stub-003',
    name: 'Priya Sharma',
    business_name: 'Sharma Indoor Environment Consulting',
    certifications: ['IICRC CMR', 'AIOH CIH', 'NRPG IAQ Specialist'],
    industries: ['Indoor Air Quality', 'Mould Remediation', 'HVAC'],
    service_areas: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
    location_city: 'Melbourne',
    location_state: 'VIC',
    nrpg_membership_tier: 'member',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-MB-00391',
    nrpg_synced_at: null,
  },
  {
    id: 'stub-004',
    name: 'Michael Tran',
    business_name: 'Tran Mould & Remediation Services',
    certifications: ['IICRC CMR', 'IICRC WRT', 'WorkSafe Asbestos Awareness'],
    industries: ['Mould Remediation', 'Water Damage', 'Building Restoration'],
    service_areas: ['Perth', 'Fremantle', 'Joondalup', 'Rockingham'],
    location_city: 'Perth',
    location_state: 'WA',
    nrpg_membership_tier: 'member',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-MB-00487',
    nrpg_synced_at: null,
  },
  {
    id: 'stub-005',
    name: 'Emma Cartwright',
    business_name: 'Cartwright Carpet & Textile Restoration',
    certifications: ['IICRC CCT', 'IICRC UFT', 'IICRC OCT'],
    industries: ['Carpet & Upholstery', 'Contents Restoration', 'Fabric Care'],
    service_areas: ['Adelaide', 'Glenelg', 'Mount Barker', 'Victor Harbor'],
    location_city: 'Adelaide',
    location_state: 'SA',
    nrpg_membership_tier: 'associate',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-AS-00712',
    nrpg_synced_at: null,
  },
  {
    id: 'stub-006',
    name: 'Nathan Kowalski',
    business_name: 'Kowalski Structural Drying Solutions',
    certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC AMRT'],
    industries: ['Structural Drying', 'Water Damage', 'Mould Prevention'],
    service_areas: ['Gold Coast', 'Tweed Heads', 'Broadbeach', 'Surfers Paradise'],
    location_city: 'Gold Coast',
    location_state: 'QLD',
    nrpg_membership_tier: 'member',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-MB-00529',
    nrpg_synced_at: null,
  },
  {
    id: 'stub-007',
    name: 'Fiona Reynolds',
    business_name: 'Reynolds Building Restoration',
    certifications: ['IICRC WRT', 'IICRC FSRT', 'NRPG Building Consultant'],
    industries: ['Building Restoration', 'Fire & Smoke', 'Heritage Buildings'],
    service_areas: ['Hobart', 'Launceston', 'Devonport', 'Burnie'],
    location_city: 'Hobart',
    location_state: 'TAS',
    nrpg_membership_tier: 'senior_member',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-SM-00203',
    nrpg_synced_at: null,
  },
  {
    id: 'stub-008',
    name: 'David Chen',
    business_name: 'Chen HVAC & Ventilation Services',
    certifications: ['AIRAH Qualified Engineer', 'IICRC ASD', 'NRPG HVAC Specialist'],
    industries: ['HVAC', 'Indoor Air Quality', 'Ventilation Systems'],
    service_areas: ['Canberra', 'Queanbeyan', 'Goulburn'],
    location_city: 'Canberra',
    location_state: 'ACT',
    nrpg_membership_tier: 'fellow',
    nrpg_membership_status: 'active',
    nrpg_member_id: 'NRPG-FL-00071',
    nrpg_synced_at: null,
  },
];

/**
 * Returns a list of professionals.
 * STUB: Currently returns static data. Swap body to DB query once NRPG
 * credentials are available (UNI-87 Track A).
 */
export async function getProfessionals(): Promise<Professional[]> {
  return STUB_PROFESSIONALS;
}
