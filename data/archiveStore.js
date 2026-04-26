import { createClient } from "@supabase/supabase-js";


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoldKey) {
    console.warn("Supabase env missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

export async function loadArchivePosts(ownerId, includeHidden = false) {
    let query = supabase
        .from("archive_posts")
        .select("*")
        .eq("owner_id", ownerId)
        .order("saved_at", { ascending: false });

    if (!includeHidden) {
        query = query.neq("hidden", true);
    }

    const { data, error } = await query;

    if (error) {
        console.error("loadArchivePosts supabase error:", error);
        return [];
    }

    return (data || []).map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        username: row.username,
        text: row.text || "",
        images: row.images || [],
        postUrl: row.post_url || "#",
        hidden: row.hidden === true,
        createdAt: row.created_at,
        savedAt: row.saved_at,
        updatedAt: row.updated_at,
    }));
}

export async function saveArchivePosts(ownerId, username, posts) {
    const rows = posts.map((post) => ({
        id: post.id,
        owner_id: ownerId,
        username,
        text: post.text || "",
        images: post.images || [],
        post_url: post.postUrl || "#",
        hidden: post.hidden === true,
        created_at: post.createdAt || null,
        updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) return [];

    const { data, error } = await supabase
        .from("archive_posts")
        .upsert(rows, { onConflict: "id" })
        .select();
    
    if (error) {
        console.error("ssaveArchivePosts supabase error:", error);
        throw error;
    }

    return data || [];
}

export async function updateArchivePostVisibility(postId, hidden) {
    const { data, error } = await supabase
        .from("archive_posts")
        .update({
            hidden,
            updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select()
        .single();
    
    if (error) {
        console.error("updateArchivePostVisibility supabase error:", error);
        throw error;
    }

    return data;
}