import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lgutfewuiptcojxcerto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXRmZXd1aXB0Y29qeGNlcnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1OTAyOTMsImV4cCI6MjEwNTE2NjI5M30.jqJt3VYvUspy-wh9oJfh5AvLpGQ02M3k955HSzLeQ3c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);