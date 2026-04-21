import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import { sanitizeObject } from '@/lib/sanitize';

export interface ProjectData {
    name: string;
    client: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    template?: string;
    teamMembers?: string[];
}

export class ProjectService {
    /**
     * Create a new project
     */
    async createProject(data: ProjectData) {
        await connectToDatabase();
        const sanitized = sanitizeObject(data);

        const project = await Project.create({
            ...sanitized,
            startDate: sanitized.startDate ? new Date(sanitized.startDate) : new Date(),
            endDate: sanitized.endDate ? new Date(sanitized.endDate) : undefined,
            progress: 0,
        });

        return JSON.parse(JSON.stringify(project));
    }

    /**
     * Get all projects
     */
    async getProjects(filters: any = {}) {
        await connectToDatabase();

        const query: any = {};
        if (filters.status && filters.status !== 'All Status') {
            query.status = filters.status;
        }
        if (filters.search) {
            query.name = { $regex: filters.search, $options: 'i' };
        }

        const projects = await Project.find(query)
            .sort({ updatedAt: -1 })
            .lean();

        // Map to frontend structure
        return JSON.parse(JSON.stringify(projects)).map((p: any) => ({
            id: p._id.toString(),
            name: p.name,
            client: p.client,
            status: p.status,
            due: p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Due Date',
            progress: p.progress,
            team: p.teamMembers?.length || 0,
            priority: p.priority,
        }));
    }

    /**
     * Get Project Dashboard Stats
     */
    async getDashboardStats() {
        await connectToDatabase();

        const [totalProjects, completedProjects, inProgressProjects, atRiskProjects, activeProjects] = await Promise.all([
            Project.countDocuments({}),
            Project.countDocuments({ status: 'Completed' }),
            Project.countDocuments({ status: 'In Progress' }),
            Project.countDocuments({ status: 'At Risk' }),
            Project.find({ status: { $ne: 'Completed' } }).sort({ updatedAt: -1 }).limit(10).lean(),
        ]);

        return {
            total: totalProjects,
            completed: completedProjects,
            inProgress: inProgressProjects,
            atRisk: atRiskProjects,
            activeProjects: JSON.parse(JSON.stringify(activeProjects)).map((p: any) => ({
                id: p._id.toString(),
                name: p.name,
                client: p.client,
                status: p.status,
                progress: p.progress,
                dueDate: p.endDate ? new Date(p.endDate).toLocaleDateString() : 'TBD',
                members: p.teamMembers?.length || 0,
                image: p.image || "bg-blue-500" // Fallback
            }))
        };
    }

    /**
     * Get project by ID
     */
    async getProjectById(id: string) {
        await connectToDatabase();
        const project = await Project.findById(id).lean();
        if (!project) return null;

        return {
            ...JSON.parse(JSON.stringify(project)),
            id: project._id.toString()
        };
    }

    /**
     * Update project
     */
    async updateProject(id: string, data: any) {
        await connectToDatabase();
        const sanitized = sanitizeObject(data);

        const project = await Project.findByIdAndUpdate(
            id,
            { $set: sanitized },
            { new: true }
        ).lean();

        if (!project) throw new Error("Project not found");

        return JSON.parse(JSON.stringify(project));
    }

    /**
     * Delete project
     */
    async deleteProject(id: string) {
        await connectToDatabase();
        const project = await Project.findByIdAndDelete(id);
        if (!project) throw new Error("Project not found");
        return true;
    }
}

export const projectService = new ProjectService();
