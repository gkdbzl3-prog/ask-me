import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
 throw new Error("SUPABASE_URL is missing");
}


if (!supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY is missing");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);