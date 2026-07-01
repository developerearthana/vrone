"use server";

import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Uploaded files are written to a persistent volume (mounted at UPLOAD_DIR) and served back
// through the /api/uploads/<name> route. Previously files were stored as base64 data: URLs
// directly in MongoDB, which bloated documents and every list payload that pulled them.
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/app/uploads";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadFile(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { error: "Unauthorized" };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return { error: "No file uploaded" };
        }
        if (file.size > MAX_SIZE) {
            return { error: "File too large. Maximum 10 MB allowed." };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const rawExt = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const ext = rawExt.slice(0, 5) || "bin";
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

        try {
            await mkdir(UPLOAD_DIR, { recursive: true });
            await writeFile(path.join(UPLOAD_DIR, filename), buffer);
            return { success: true, url: `/api/uploads/${filename}`, filename: file.name };
        } catch (fsErr) {
            // Fallback: if the volume isn't writable, keep working by storing inline as before.
            console.error("Disk upload failed, falling back to data URL:", fsErr);
            const base64String = buffer.toString("base64");
            return { success: true, url: `data:${file.type};base64,${base64String}`, filename: file.name };
        }
    } catch (error: any) {
        console.error("Upload error:", error);
        return { error: "Failed to upload file" };
    }
}
