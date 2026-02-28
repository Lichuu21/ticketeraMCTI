import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://deftutfyjpdlneiyzejm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZnR1dGZ5anBkbG5laXl6ZWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTU1MzEsImV4cCI6MjA4NzY5MTUzMX0.LHP2e4eZ-CIwHvKMCQhKXK-TOH6XJBvK7si9E_DBGSA'

export const supabase = createClient(supabaseUrl, supabaseKey)