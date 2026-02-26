import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cjitydjdrktvbciwapvl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaXR5ZGpkcmt0dmJjaXdhcHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTI3NjIsImV4cCI6MjA4NjU2ODc2Mn0._3QbNo8h3Mhy9TGW_W2MJs4Cbte1I4ZNgpXENzO4LNg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
