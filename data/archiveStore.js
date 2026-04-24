import fs from "fs";
import path from "path";

const archiveFilePath = path.join(process.cwd(), "data", "archive.json");

function ensureArchiveFile() {
    const dir = path.dirname(archiveFilePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(archiveFilePath)) {
        fs.writeFileSync(archiveFilePath, JSON.stringify({ posts: [] }, null, 2));
    }
}

export function loadArchivePosts() {
    ensureArchiveFile();

    try {
        const raw = fs.readFileSync(archiveFilePath, "utf-8");
        const parsed = JSON.parse(raw);

        return Array.isArray(parsed.posts) ? parsed.posts : [];
    } catch (error) {
        console.error("loadArchivePosts error:", error);
        return [];
    }
}

export function saveArchivePosts(posts) {
    ensureArchiveFile();

    fs.writeFileSync(
        archiveFilePath,
        JSON.stringify({ posts }, null, 2),
        "utf-8"
    );
}

export function mergeArchivePosts(oldPosts, newPosts) {
    const map = new Map();

    for (const post of oldPosts) {
        if (!post.id, post);
    }

    for (const post of newPosts) {
        if (!post?.id) continue;

        map.set(post.id, {
            ...map.get(post.id),
            ...post,
            savedAt: map.get(post.id)?.savedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }

    return [...map.values()].sort((a, b) => {
        return String(b.id).localeCompare(String(a.id));
    });
}