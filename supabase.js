import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
 throw new Error("SUPABASE_URL is missing");
}

if (!supabaseServiceKey) {
 throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
}


export const supabase = createClient(supabaseUrl, supabaseServiceKey);