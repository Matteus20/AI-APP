
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imdkvwfjnhqlgfkpwfgl.supabase.co';
const supabaseAnonKey = 'sb_publishable_yeZOBzdewsckYxtaE3YyyQ_Ho3erBWC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
