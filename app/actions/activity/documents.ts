'use server';

import { auth } from '@/auth';
import DocumentModel from '@/models/Document';
import FolderModel from '@/models/Folder';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

function isAdminRole(role?: string) {
    const r = (role || '').toLowerCase();
    return r === 'admin' || r === 'super-admin';
}

// A folder is visible if: the user created it, it's shared with everyone, it's shared with the
// user explicitly, or it's a legacy folder with no visibility set (backward compatibility).
function canAccessFolder(folder: any, userId: string, isAdmin: boolean): boolean {
    if (isAdmin) return true;
    if (String(folder.createdBy) === String(userId)) return true;
    if (folder.visibility === undefined) return true; // legacy folders remain visible
    if (folder.visibility === 'shared') {
        return !folder.sharedWith?.length || folder.sharedWith.map(String).includes(String(userId));
    }
    return false;
}

export async function uploadFile(formData: FormData) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const file = formData.get('file') as File;
        const folderId = formData.get('folderId') as string | null;
        if (!file) throw new Error('No file provided');

        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) throw new Error('File too large. Maximum 10 MB allowed.');

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Store on the uploads volume (served via /api/uploads); fall back to a data URL only
        // if the disk isn't writable — same convention as the main uploader.
        let url: string;
        try {
            const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
            const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
            await mkdir(UPLOAD_DIR, { recursive: true });
            await writeFile(path.join(UPLOAD_DIR, filename), buffer);
            url = `/api/uploads/${filename}`;
        } catch {
            url = `data:${file.type};base64,${buffer.toString('base64')}`;
        }

        const newDoc = new DocumentModel({
            name: file.name,
            folderId: folderId || undefined,
            url,
            type: file.type,
            size: file.size,
            uploadedBy: session.user.id
        });

        await newDoc.save();
        revalidatePath('/activity/documents');
        return { success: true, data: JSON.parse(JSON.stringify(newDoc)) };
    } catch (error: any) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
    }
}

export async function createFolder(name: string, parentId?: string, visibility: 'private' | 'shared' = 'private', sharedWith: string[] = []) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const newFolder = new FolderModel({
            name,
            parentId: parentId || undefined,
            createdBy: session.user.id,
            visibility,
            sharedWith,
        });

        await newFolder.save();
        revalidatePath('/activity/documents');
        return { success: true, data: JSON.parse(JSON.stringify(newFolder)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function setFolderSharing(folderId: string, visibility: 'private' | 'shared', sharedWith: string[] = []) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const folder = await FolderModel.findById(folderId);
        if (!folder) throw new Error('Folder not found');
        // Only the owner or an admin may change sharing
        if (String(folder.createdBy) !== String(session.user.id) && !isAdminRole(session.user.role)) {
            throw new Error('Only the folder owner can change sharing');
        }

        folder.visibility = visibility;
        folder.sharedWith = visibility === 'shared' ? sharedWith : [];
        await folder.save();
        revalidatePath('/activity/documents');
        return { success: true, data: JSON.parse(JSON.stringify(folder)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getShareableUsers() {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        const users = await User.find({ _id: { $ne: session.user.id }, status: 'Active' }, 'name email image').sort({ name: 1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(users)) };
    } catch (error: any) {
        return { success: false, error: error.message, data: [] };
    }
}

export async function getContents(folderId?: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        const userId = session.user.id;
        const isAdmin = isAdminRole(session.user.role);

        const query = folderId ? { folderId } : { folderId: { $exists: false } };
        const foldersQuery = folderId ? { parentId: folderId } : { parentId: { $exists: false } };

        const docs = await DocumentModel.find(query).sort({ createdAt: -1 }).lean();
        const allFolders = await FolderModel.find(foldersQuery).sort({ name: 1 }).lean();
        // Filter folders by access — creator, shared-to-all, shared-to-me, or legacy
        const folders = allFolders
            .filter((f: any) => canAccessFolder(f, userId, isAdmin))
            .map((f: any) => ({ ...f, isOwner: String(f.createdBy) === String(userId) || isAdmin }));

        return {
            success: true,
            data: {
                documents: JSON.parse(JSON.stringify(docs)),
                folders: JSON.parse(JSON.stringify(folders))
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}



export async function deleteItem(id: string, type: 'file' | 'folder') {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        if (type === 'file') {
            const doc = await DocumentModel.findById(id);
            if (doc) {
                // Deleting the document from MongoDB removes the file since it is baked into the URL Field.
                await DocumentModel.findByIdAndDelete(id);
            }
        } else {
            // Safe delete: Check for children (files or subfolders)
            const hasFiles = await DocumentModel.exists({ folderId: id });
            const hasSubfolders = await FolderModel.exists({ parentId: id });

            if (hasFiles || hasSubfolders) {
                throw new Error('Folder is not empty. Delete contents first.');
            }

            await FolderModel.findByIdAndDelete(id);
        }

        revalidatePath('/activity/documents');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function renameFolder(id: string, newName: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const folder = await FolderModel.findByIdAndUpdate(id, { name: newName }, { new: true });
        if (!folder) throw new Error('Folder not found');

        revalidatePath('/activity/documents');
        return { success: true, data: JSON.parse(JSON.stringify(folder)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
