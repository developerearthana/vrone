import { format } from 'date-fns';
import connectToDatabase from '@/lib/db';
import Payroll from '@/models/Payroll';
import User from '@/models/User';
import Employee from '@/models/Employee';
import LeaveRequest from '@/models/LeaveRequest';
import Attendance from '@/models/Attendance';
import Candidate from '@/models/Candidate';
import { sanitizeObject } from '@/lib/sanitize';

// Compute how many days until the next occurrence of a birthday from `from`.
// Returns null if no valid DOB. Handles year rollover.
function daysUntilBirthday(dob: Date, from: Date): number | null {
    if (!dob || isNaN(dob.getTime())) return null;
    const next = new Date(from.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < from) next.setFullYear(from.getFullYear() + 1);
    return Math.round((next.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export class HRMService {
    async getDashboardStats() {
        await connectToDatabase();

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + 1);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [activeEmployees, onLeaveRecords, todayAttendance, newJoinersList, candidates] = await Promise.all([
            Employee.find({ status: 'Active' }, 'name email image dept jobTitle employeeId dateOfBirth').lean(),
            LeaveRequest.find({
                status: 'Approved',
                startDate: { $lte: now },
                endDate: { $gte: now }
            }).populate('userId', 'name email image dept').lean(),
            Attendance.find({
                date: { $gte: today, $lt: nextDay },
                punchIn: { $exists: true, $ne: null }
            }).populate('userId', 'name email role image dept').lean(),
            Employee.find({
                createdAt: { $gte: startOfMonth }
            }, 'name email image dept jobTitle employeeId createdAt').lean(),
            Candidate.find({}, 'status').lean(),
        ]);

        // User and Employee are SEPARATE collections joined by email — attendance.userId points to
        // a User, so we key the attendance map by the punched-in user's email, not by _id
        // (Employee._id !== User._id, which previously made every employee show as absent).
        const attByEmail = new Map<string, any>();
        todayAttendance.forEach((a: any) => {
            const email = a.userId?.email?.toLowerCase();
            if (email) attByEmail.set(email, a);
        });

        const checkedInList: any[] = [];
        const absenteesList: any[] = [];
        let officeCount = 0;
        let wfhCount = 0;

        activeEmployees.forEach((emp: any) => {
            const rec = emp.email ? attByEmail.get(emp.email.toLowerCase()) : null;
            if (rec && rec.status !== 'Absent') {
                const mode = rec.workMode === 'Remote' ? 'Remote' : 'Office';
                if (mode === 'Remote') wfhCount++; else officeCount++;
                checkedInList.push({ ...emp, workMode: mode, status: rec.status, punchIn: rec.punchIn });
            } else {
                absenteesList.push(emp);
            }
        });

        const onLeaveList = onLeaveRecords.map((l: any) => l.userId).filter(Boolean);

        // Upcoming birthdays within the next 30 days, soonest first
        const birthdays = activeEmployees
            .map((emp: any) => {
                const days = emp.dateOfBirth ? daysUntilBirthday(new Date(emp.dateOfBirth), today) : null;
                return days !== null && days <= 30
                    ? { name: emp.name, dept: emp.dept, jobTitle: emp.jobTitle, image: emp.image, date: emp.dateOfBirth, days }
                    : null;
            })
            .filter(Boolean)
            .sort((a: any, b: any) => a.days - b.days);

        // Recruitment pipeline — live counts per stage
        const pipeline: Record<string, number> = { Applied: 0, Screening: 0, Interview: 0, Selected: 0, Rejected: 0 };
        candidates.forEach((c: any) => { if (pipeline[c.status] !== undefined) pipeline[c.status]++; });

        return JSON.parse(JSON.stringify({
            totalEmployees: activeEmployees.length,
            onLeaveToday: onLeaveList.length,
            checkedInToday: checkedInList.length,
            newJoiners: newJoinersList.length,
            workMode: { office: officeCount, wfh: wfhCount },
            pipeline,
            lists: {
                employees: activeEmployees,
                absentees: absenteesList,
                checkedIn: checkedInList,
                newJoiners: newJoinersList,
                onLeave: onLeaveList,
                birthdays,
            }
        }));
    }

    async getPayslips(employeeId: string) {
        await connectToDatabase();
        // For demo, if no ID passed or mock user, return all or filtered.
        // In real app, strictly filter by session user ID.
        const query = employeeId ? { employeeId } : {};

        const slips = await Payroll.find(query).sort({ paymentDate: -1 }).lean();

        // Mock data if empty for demo purposes (Important for "wow" factor if db empty)
        if (slips.length === 0) {
            return []; // Return empty so UI handles it or we can seed
        }

        return JSON.parse(JSON.stringify(slips)).map((slip: any) => ({
            month: slip.month,
            status: slip.status,
            current: slip.month === 'October 2025', // Mock logic for current
            fileUrl: `/api/payslips/${slip._id}` // Placeholder URL
        }));
    }

    async getLeaveRequests(filter: any = {}) {
        await connectToDatabase();
        const requests = await LeaveRequest.find(filter).sort({ createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(requests));
    }

    async createLeaveRequest(data: any) {
        await connectToDatabase();
        if (!data.userId) throw new Error("User ID is required");

        // Ensure dates are date objects
        const sanitized = {
            ...sanitizeObject(data),
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate)
        };

        const leave = await LeaveRequest.create(sanitized);
        return JSON.parse(JSON.stringify(leave));
    }

    async updateLeaveStatus(id: string, status: string, approverId?: string, approverName?: string, approverRole?: string) {
        await connectToDatabase();
        const update: any = { status };
        if (approverId) update.approverId = approverId;
        if (approverName) update.approverName = approverName;
        if (approverRole) update.approverRole = approverRole;

        const leave = await LeaveRequest.findByIdAndUpdate(id, update, { new: true });
        return JSON.parse(JSON.stringify(leave));
    }

    async createPayslip(data: any) {
        await connectToDatabase();
        const sanitized = sanitizeObject(data);
        const slip = await Payroll.create(sanitized);
        return JSON.parse(JSON.stringify(slip));
    }

    async getAttendance(userId: string, month?: number, year?: number) {
        await connectToDatabase();
        const query: any = { userId };

        if (month !== undefined && year !== undefined) {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const records = await Attendance.find(query).sort({ date: 1 }).lean();
        return JSON.parse(JSON.stringify(records));
    }

    async getAllAttendance(date?: Date) {
        await connectToDatabase();
        const targetDate = date || new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const records = await Attendance.find({
            date: { $gte: targetDate, $lt: nextDay }
        }).populate('userId', 'name email dept role').sort({ punchIn: 1 }).lean();

        return JSON.parse(JSON.stringify(records));
    }

    async getAttendanceReport(month: number, year: number) {
        await connectToDatabase();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        // Note: user `image` (often a large base64 data URI) is deliberately excluded — the report
        // renders initials and payroll only needs hours/status, so pulling avatars bloats the payload.
        const records = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        }).populate('userId', 'name email dept role').sort({ date: -1, punchIn: 1 }).lean();

        return JSON.parse(JSON.stringify(records));
    }

    async getAbsentees(date?: Date) {
        await connectToDatabase();
        const targetDate = date || new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const activeUsers = await User.find({ status: 'Active' }, 'name email dept role image').lean();
        const attendances = await Attendance.find({
            date: { $gte: targetDate, $lt: nextDay }
        }).lean();

        const attendanceMap = new Map();
        attendances.forEach(a => attendanceMap.set(a.userId.toString(), a));

        const absentees = activeUsers.filter(user => {
            const userId = user._id.toString();
            if (!attendanceMap.has(userId)) return true;
            const record = attendanceMap.get(userId);
            if (record.status === 'Absent') return true;
            return false;
        });

        return JSON.parse(JSON.stringify(absentees));
    }

    async getLiveUsers() {
        await connectToDatabase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + 1);

        const records = await Attendance.find({
            date: { $gte: today, $lt: nextDay },
            punchIn: { $exists: true, $ne: null },
            punchOut: { $exists: false }
        }).populate('userId', 'name email dept role image').lean();

        return JSON.parse(JSON.stringify(records));
    }

    async punchIn(userId: string, workMode: 'Office' | 'Remote' = 'Office', location?: { lat: number; lng: number }) {
        await connectToDatabase();

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const activeRecord = await Attendance.findOne({
            userId,
            date: { $gte: today },
            punchIn: { $exists: true, $ne: null },
            $or: [{ punchOut: { $exists: false } }, { punchOut: null }]
        });

        if (activeRecord) throw new Error('Already punched in. Please punch out first.');

        const update: any = {
            punchIn: now,
            status: workMode === 'Remote' ? 'WFH' : 'Present',
            workMode,
            punchOut: null,
        };
        if (location?.lat && location?.lng) update.location = location;

        const record = await Attendance.findOneAndUpdate(
            { userId, date: today },
            { $set: update },
            { upsert: true, new: true }
        );

        return JSON.parse(JSON.stringify(record));
    }

    async adminAdjustAttendance(data: {
        userId: string;
        date: string;
        punchIn?: string;
        punchOut?: string;
        status: string;
        workMode: string;
        remarks?: string;
    }) {
        await connectToDatabase();

        // Parse as local date components — new Date("YYYY-MM-DD") is UTC midnight which
        // shifts to the wrong calendar day in non-UTC timezones, causing the upsert to
        // miss the existing record and create a duplicate with a different date key.
        const [y, m, d] = data.date.split('-').map(Number);
        const date = new Date(y, m - 1, d);

        const punchInDate = data.punchIn ? new Date(data.punchIn) : undefined;
        const punchOutDate = data.punchOut ? new Date(data.punchOut) : undefined;

        let hoursWorked = 0;
        if (punchInDate && punchOutDate) {
            hoursWorked = Math.round((punchOutDate.getTime() - punchInDate.getTime()) / (1000 * 60 * 60) * 100) / 100;
        }

        const update: any = {
            status: data.status,
            workMode: data.workMode,
            adminAdjusted: true,
            hoursWorked,
        };
        if (punchInDate) update.punchIn = punchInDate;
        if (punchOutDate) update.punchOut = punchOutDate;
        if (data.remarks) update.remarks = data.remarks;

        const record = await Attendance.findOneAndUpdate(
            { userId: data.userId, date },
            { $set: update },
            { upsert: true, new: true }
        );

        return JSON.parse(JSON.stringify(record));
    }

    async deleteAttendanceRecord(id: string) {
        await connectToDatabase();
        const deleted = await Attendance.findByIdAndDelete(id);
        if (!deleted) throw new Error('Record not found');
    }

    async punchOut(userId: string) {
        await connectToDatabase();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find open punch-in session today
        const record = await Attendance.findOne({
            userId,
            date: { $gte: today },
            punchIn: { $exists: true, $ne: null },
            $or: [{ punchOut: { $exists: false } }, { punchOut: null }]
        });

        if (!record || !record.punchIn) throw new Error("You haven't punched in yet or already punched out.");

        const punchOutTime = new Date();
        const hoursWorked = Math.round(
            (punchOutTime.getTime() - new Date(record.punchIn).getTime()) / (1000 * 60 * 60) * 100
        ) / 100;

        record.punchOut = punchOutTime;
        record.hoursWorked = hoursWorked;
        await record.save();

        return JSON.parse(JSON.stringify(record));
    }

    async generatePayroll(month: string, year: number) {

        await connectToDatabase();

        // 1. Get all active users with salary structure
        const users = await User.find({ status: 'Active' });

        const payrolls = [];

        for (const user of users) {
            if (!user.salaryStructure) continue;

            const { basic = 0, hra = 0, allowances = 0, deductions } = user.salaryStructure;
            const gross = basic + hra + allowances;
            const totalFixedDeductions = (deductions?.pf || 0) + (deductions?.tax || 0) + (deductions?.other || 0);

            // 2. Calculate Attendance / LOP
            // Simplified: Assume 30 days. Count 'Absent' in the given month.
            const startDate = new Date(year, new Date(Date.parse(month + " 1, 2000")).getMonth(), 1);
            const endDate = new Date(year, new Date(Date.parse(month + " 1, 2000")).getMonth() + 1, 0);

            const absentDays = await Attendance.countDocuments({
                userId: user._id,
                date: { $gte: startDate, $lte: endDate },
                status: 'Absent'
            });

            const perDaySalary = gross / 30; // Standard 30 days
            const lop = Math.round(absentDays * perDaySalary);

            const totalDeductions = totalFixedDeductions + lop;
            const netPay = Math.max(0, gross - totalDeductions);

            // 3. Create or Update Payroll Record
            const payrollData = {
                employeeId: user._id,
                employeeName: user.name,
                month: `${month} ${year}`,
                status: 'Processed',
                salary: { basic, hra, allowances, gross },
                deductions: {
                    pf: deductions?.pf || 0,
                    tax: deductions?.tax || 0,
                    lop: lop,
                    other: deductions?.other || 0,
                    total: totalDeductions
                },
                netPay,
                paymentDate: new Date()
            };

            const payroll = await Payroll.findOneAndUpdate(
                { employeeId: user._id, month: `${month} ${year}` },
                payrollData,
                { upsert: true, new: true }
            );
            payrolls.push(payroll);
        }

        return JSON.parse(JSON.stringify(payrolls));
    }

    async generatePayrollForEmployee(employeeId: string, month: string, year: number) {
        await connectToDatabase();
        const user = await User.findById(employeeId);
        if (!user) throw new Error('Employee not found');
        if (!user.salaryStructure) throw new Error(`No salary structure configured for ${user.name}. Please set up salary first.`);

        const { basic = 0, hra = 0, allowances = 0, deductions } = user.salaryStructure;
        const gross = basic + hra + allowances;
        const totalFixedDeductions = (deductions?.pf || 0) + (deductions?.tax || 0) + (deductions?.other || 0);

        const monthIndex = new Date(Date.parse(month + ' 1, 2000')).getMonth();
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);

        const [absentDays, presentDays, totalHours] = await Promise.all([
            Attendance.countDocuments({ userId: user._id, date: { $gte: startDate, $lte: endDate }, status: 'Absent' }),
            Attendance.countDocuments({ userId: user._id, date: { $gte: startDate, $lte: endDate }, status: { $in: ['Present', 'WFH', 'Half-Day'] } }),
            Attendance.aggregate([
                { $match: { userId: user._id, date: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: null, total: { $sum: '$hoursWorked' } } }
            ])
        ]);

        const workedHours = totalHours[0]?.total || 0;
        const perDaySalary = gross / 30;
        const lop = Math.round(absentDays * perDaySalary);
        const totalDeductions = totalFixedDeductions + lop;
        const netPay = Math.max(0, gross - totalDeductions);

        const payrollData = {
            employeeId: user._id,
            employeeName: user.name,
            month: `${month} ${year}`,
            status: 'Pending',
            salary: { basic, hra, allowances, gross },
            deductions: { pf: deductions?.pf || 0, tax: deductions?.tax || 0, lop, other: deductions?.other || 0, total: totalDeductions },
            netPay,
            paymentDate: new Date(),
            attendanceSummary: { presentDays, absentDays, workedHours: Math.round(workedHours * 10) / 10 }
        };

        const payroll = await Payroll.findOneAndUpdate(
            { employeeId: user._id, month: `${month} ${year}` },
            payrollData,
            { upsert: true, new: true }
        );
        return JSON.parse(JSON.stringify(payroll));
    }

    async getAllPayrollForMonth(month: string, year: number) {
        await connectToDatabase();
        const payrolls = await Payroll.find({ month: `${month} ${year}` }).sort({ employeeName: 1 });
        return JSON.parse(JSON.stringify(payrolls));
    }

    async markPayrollPaid(payrollId: string) {
        await connectToDatabase();
        const payroll = await Payroll.findByIdAndUpdate(payrollId, { status: 'Paid', paymentDate: new Date() }, { new: true });
        return JSON.parse(JSON.stringify(payroll));
    }

    async getAttendancePulse() {
        await connectToDatabase();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // Assume standard login time is 09:30 AM
        // We'll count records where punchIn exists and is after 09:30 AM on that day
        const records = await Attendance.find({
            date: { $gte: thirtyDaysAgo },
            punchIn: { $exists: true }
        });

        const pulse: Record<string, number> = {};

        records.forEach(rec => {
            const dateKey = format(new Date(rec.date), 'yyyy-MM-dd');
            const punchInTime = new Date(rec.punchIn!);
            const standardTime = new Date(rec.punchIn!);
            standardTime.setHours(9, 30, 0, 0);

            if (punchInTime > standardTime) {
                pulse[dateKey] = (pulse[dateKey] || 0) + 1;
            } else {
                if (!pulse[dateKey]) pulse[dateKey] = 0;
            }
        });

        return pulse;
    }
}

export const hrmService = new HRMService();
