export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            calendar_events: {
                Row: {
                    id: string
                    organization_id: string
                    created_at: string
                    title: string
                    description: string | null
                    start_time: string
                    end_time: string
                    type: 'medical' | 'vaccine' | 'school' | 'outing' | 'other'
                    location: string | null
                    child_id: string | null
                    created_by: string | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    created_at?: string
                    title: string
                    description?: string | null
                    start_time: string
                    end_time: string
                    type: 'medical' | 'vaccine' | 'school' | 'outing' | 'other'
                    location?: string | null
                    child_id?: string | null
                    created_by?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    created_at?: string
                    title?: string
                    description?: string | null
                    start_time?: string
                    end_time?: string
                    type?: 'medical' | 'vaccine' | 'school' | 'outing' | 'other'
                    location?: string | null
                    child_id?: string | null
                    created_by?: string | null
                }
            }
            children: {
                Row: {
                    id: string
                    organization_id: string
                    full_name: string
                    date_of_birth: string | null
                    admission_date: string | null
                    status: 'active' | 'pending' | 'urgent'
                    unit: string | null
                    legal_status: string | null
                    photo_url: string | null
                    created_at: string
                    mother_name: string | null
                    father_name: string | null
                    judicial_process: string | null
                    nis: string | null
                    cpf: string | null
                    rg: string | null
                    gender: string | null
                    ethnicity: string | null
                    health_info: string | null
                    allergies: string | null
                    medications: string | null
                    schooling: string | null
                    religion: string | null
                    clothes_size: string | null
                    shoes_size: string | null
                    reason_for_admission: string | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    full_name: string
                    date_of_birth?: string | null
                    admission_date?: string | null
                    status?: 'active' | 'pending' | 'urgent'
                    unit?: string | null
                    legal_status?: string | null
                    photo_url?: string | null
                    created_at?: string
                    mother_name?: string | null
                    father_name?: string | null
                    judicial_process?: string | null
                    nis?: string | null
                    cpf?: string | null
                    rg?: string | null
                    gender?: string | null
                    ethnicity?: string | null
                    health_info?: string | null
                    allergies?: string | null
                    medications?: string | null
                    schooling?: string | null
                    religion?: string | null
                    clothes_size?: string | null
                    shoes_size?: string | null
                    reason_for_admission?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    full_name?: string
                    date_of_birth?: string | null
                    admission_date?: string | null
                    status?: 'active' | 'pending' | 'urgent'
                    unit?: string | null
                    legal_status?: string | null
                    photo_url?: string | null
                    created_at?: string
                    mother_name?: string | null
                    father_name?: string | null
                    judicial_process?: string | null
                    nis?: string | null
                    cpf?: string | null
                    rg?: string | null
                    gender?: string | null
                    ethnicity?: string | null
                    health_info?: string | null
                    allergies?: string | null
                    medications?: string | null
                    schooling?: string | null
                    religion?: string | null
                    clothes_size?: string | null
                    shoes_size?: string | null
                    reason_for_admission?: string | null
                }
            }
            logs: {
                Row: {
                    id: string
                    organization_id: string
                    child_id: string
                    staff_id: string
                    category: 'behavior' | 'health' | 'education' | 'meal' | 'incident'
                    mood: string | null
                    description: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    child_id: string
                    staff_id: string
                    category: 'behavior' | 'health' | 'education' | 'meal' | 'incident'
                    mood?: string | null
                    description?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    child_id?: string
                    staff_id?: string
                    category?: 'behavior' | 'health' | 'education' | 'meal' | 'incident'
                    mood?: string | null
                    description?: string | null
                    created_at?: string
                }
            }
            organizations: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    role: 'saas_admin' | 'org_admin' | 'pedagogue' | 'technician' | 'educator' | 'operational' | null
                    organization_id: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    role?: 'saas_admin' | 'org_admin' | 'pedagogue' | 'technician' | 'educator' | 'operational' | null
                    organization_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    role?: 'saas_admin' | 'org_admin' | 'pedagogue' | 'technician' | 'educator' | 'operational' | null
                    organization_id?: string | null
                    created_at?: string
                }
            }
            plans: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    price_monthly: number
                    max_children: number | null
                    max_users: number | null
                    features: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    price_monthly: number
                    max_children?: number | null
                    max_users?: number | null
                    features?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    price_monthly?: number
                    max_children?: number | null
                    max_users?: number | null
                    features?: Json
                    created_at?: string
                }
            }
            subscriptions: {
                Row: {
                    id: string
                    organization_id: string
                    plan_id: string
                    status: 'active' | 'past_due' | 'canceled' | 'trialing'
                    current_period_start: string | null
                    current_period_end: string | null
                    cancel_at_period_end: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    plan_id: string
                    status?: 'active' | 'past_due' | 'canceled' | 'trialing'
                    current_period_start?: string | null
                    current_period_end?: string | null
                    cancel_at_period_end?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    plan_id?: string
                    status?: 'active' | 'past_due' | 'canceled' | 'trialing'
                    current_period_start?: string | null
                    current_period_end?: string | null
                    cancel_at_period_end?: boolean
                    created_at?: string
                }
            }
        }
    }
}
