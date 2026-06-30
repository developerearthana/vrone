'use server';

import { auth } from '@/auth';
import Task, { ITask } from '@/models/Task';
import connectToDatabase from '@/lib/db';
import { revalidatePath } from 'next/cache';



export async function createTask(data: Partial<ITask>) {
    try {
        await connectToDatabase();
        const session = await auth();

        if (!session?.user?.id) {
            throw new Error('Unauthorized: No user session');
        }

        const newTask = new Task({
            ...data,
            createdBy: session.user.id,
        });

        await newTask.save();

        revalidatePath('/activity/todo'); // Assuming todo page
        return { success: true, data: JSON.parse(JSON.stringify(newTask)) };
    } catch (error: any) {
        console.error("Create Task Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateTask(id: string, data: Partial<ITask>) {
    try {
        await connectToDatabase();
        const session = await auth();
        // Check perms if needed, for now allow login user
        if (!session?.user?.id) throw new Error('Unauthorized');

        const task = await Task.findByIdAndUpdate(id, data, { new: true });
        revalidatePath('/activity/todo');

        return { success: true, data: JSON.parse(JSON.stringify(task)) };
    } catch (error: any) {

        return { success: false, error: error.message };
    }
}

export async function updateTaskStatus(id: string, status: string) {
    return updateTask(id, { status: status as any });
}

export async function deleteTask(id: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized'); // Security check

        await Task.findByIdAndDelete(id);
        revalidatePath('/activity/todo');

        return { success: true };
    } catch (error: any) {

        return { success: false, error: error.message };
    }
}

export async function getTasks(filter: any = {}) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const query = {
            $or: [
                { createdBy: session.user.id },
                { assignees: session.user.id }
            ],
            ...filter
        };

        const tasks = await Task.find(query).sort({ createdAt: -1 });
        return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getTeamTasks(teamId: string) {
    try {
        await connectToDatabase();
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');
        const tasks = await Task.find({ teamId, status: { $ne: 'Archived' } }).sort({ createdAt: -1 });
        return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
