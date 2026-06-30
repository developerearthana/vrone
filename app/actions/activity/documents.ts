'use server';

import { auth } from '@/auth';
import DocumentModel from '@/models/Document';
import FolderModel from '@/models/Folder';
import connectToDatabase from '@/lib/db';
import { revalidatePath } from 'next/cache';
// Removed fs.writeFile dependencies as the application runs on ephemeral live storage. files are stored as Base64 strings.

export async function uploadFile(formData: FormData) {
    try {

        await connectToDatabase();
        const session = await auth();

        if (!session?.user?.id) throw new Error('Unauthorized');

        const file = formData.get('file') as File;
        const folderId = formData.get('folderId') as string | null;

        if (!file) throw new Error('No file provided');

        // 10 MB Limit matching the vault configurations for consistency
        const MAX_DATA_URL_SIZE = 10 * 1024 * 1024; 
        if (file.size > MAX_DATA_URL_SIZE) {
            throw new Error(`File too large for live persistence. Maximum 10 MB allowed.`);
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Convert array buffer straight to a live-safe Base64 encoded string format
        const base64String = buffer.toString('base64');
        const publicUrl = `data:${file.type};base64,${base64String}`;

        const newDoc = new DocumentModel({
            name: file.name,
            folderId: folderId || undefined,
            url: publicUrl,
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

export async function createFolder(name: string, parentId?: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const newFolder = new FolderModel({
            name,
            parentId: parentId || undefined,
            createdBy: session.user.id
        });

        await newFolder.save();
        revalidatePath('/activity/documents');
        return { success: true, data: JSON.parse(JSON.stringify(newFolder)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getContents(folderId?: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const query = folderId ? { folderId } : { folderId: { $exists: false } };
        const foldersQuery = folderId ? { parentId: folderId } : { parentId: { $exists: false } };

        // Should restrict by user? Or Team? Assuming shared for now or visible to creator.
        // Let's make it visible to all for team collaboration as per requirement.

        const docs = await DocumentModel.find(query).sort({ createdAt: -1 });
        const folders = await FolderModel.find(foldersQuery).sort({ name: 1 });

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
