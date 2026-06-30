/**
 * Vrone ERP — Comprehensive Seed Script
 * Run: docker exec vrone-dev-mongo mongosh vrone_dev /scripts/seed-all.js
 *
 * Earthana Environment Solution P.Ltd context
 * Password for all seeded users: Earthana@2024
 */

const PWD_HASH = "$2b$10$bvlu8lr6Z7dwQz7NFM7GCelkIzU1o1TYmFAqt5bZzSI9nrqKG1K3G";

const now = new Date();
const d = (offsetDays) => new Date(now.getTime() + offsetDays * 86400000);

// ─── existing reference IDs ───────────────────────────────────────────────────
const COMPANY_ID    = ObjectId("6a3fd1bf5fd8f72231d21991");
const SUB_CORP      = ObjectId("6a3fdf243633cf37f72e9e82"); // Earthana Corporate
const SUB_GRIDWISE  = ObjectId("6a3ff43fb1c81cd154820a96"); // Gridwise Chennai
const SUB_RUDRA     = ObjectId("6a3ff48cb1c81cd154820a9d"); // Rudra Architecture
const SUB_METRUM    = ObjectId("6a40d978b81043ab479c297a"); // Metrum Works
const DEPT_OPS      = ObjectId("6a3fdf243633cf37f72e9e8a");
const DEPT_PROJ     = ObjectId("6a3fdf243633cf37f72e9e8b");
const DEPT_HR       = ObjectId("6a3fdf243633cf37f72e9e8c");
const DEPT_FIN      = ObjectId("6a3fdf243633cf37f72e9e8e");
const DEPT_SALES    = ObjectId("6a3fdf243633cf37f72e9e90");
const DEPT_IT       = ObjectId("6a3fdf243633cf37f72e9e92");

// ─── fresh IDs for seeded docs ───────────────────────────────────────────────
const U_SUPERADMIN  = ObjectId();
const U_ADMIN       = ObjectId();
const U_HR          = ObjectId();
const U_PM          = ObjectId();
const U_STAFF1      = ObjectId();
const U_STAFF2      = ObjectId();

const E_SUPERADMIN  = ObjectId();
const E_ADMIN       = ObjectId();
const E_HR          = ObjectId();
const E_PM          = ObjectId();
const E_STAFF1      = ObjectId();
const E_STAFF2      = ObjectId();

const KPI_REVENUE   = ObjectId();
const KPI_ACQRATE   = ObjectId();
const KPI_PROJCOMP  = ObjectId();
const KPI_ATTEND    = ObjectId();
const KPI_COST      = ObjectId();

const GOAL_REV      = ObjectId();
const GOAL_HR       = ObjectId();
const GOAL_GREEN    = ObjectId();

const PROJ_ERP      = ObjectId();
const PROJ_SOLAR    = ObjectId();
const PROJ_FITOUT   = ObjectId();

const LEAD_TF       = ObjectId();
const LEAD_GB       = ObjectId();
const LEAD_APEX     = ObjectId();
const LEAD_ECO      = ObjectId();

const CON_TF        = ObjectId();
const CON_APEX      = ObjectId();
const CON_GW        = ObjectId();
const CON_GB        = ObjectId();
const CON_RAVI      = ObjectId();

const DEAL_ERP      = ObjectId();
const DEAL_SOLAR    = ObjectId();
const DEAL_FITOUT   = ObjectId();

const PROD_SENSOR   = ObjectId();
const PROD_SOLAR    = ObjectId();
const PROD_LOGGER   = ObjectId();
const PROD_SW       = ObjectId();
const PROD_SAFETY   = ObjectId();
const PROD_CARBON   = ObjectId();

const PO_1 = ObjectId();
const PO_2 = ObjectId();
const PO_3 = ObjectId();

const INV_1 = ObjectId();
const INV_2 = ObjectId();
const INV_3 = ObjectId();
const INV_4 = ObjectId();

const BANK_HDFC = ObjectId();
const BANK_SBI  = ObjectId();

const ASSET_LAPTOP1 = ObjectId();
const ASSET_MAC     = ObjectId();
const ASSET_CAR     = ObjectId();
const ASSET_MON     = ObjectId();

const CAMP_SM  = ObjectId();
const CAMP_EM  = ObjectId();
const CAMP_OFF = ObjectId();

const WO_1 = ObjectId();
const WO_2 = ObjectId();
const WO_3 = ObjectId();

// ─── guard: skip if users already seeded ─────────────────────────────────────
const alreadySeeded = db.users.countDocuments({ email: "superadmin@earthana.in" }) > 0;
if (alreadySeeded) {
    print("⚠️  Seed data already present. Drop & re-seed if needed.");
    quit(0);
}

print("\n🌱 Seeding Vrone ERP — Earthana Environment Solution\n");

// ═══════════════════════════════════════════════════════════════════════════════
// 1. USERS
// ═══════════════════════════════════════════════════════════════════════════════
db.users.insertMany([
    {
        _id: U_SUPERADMIN, name: "Rahul Sharma", email: "superadmin@earthana.in",
        password: PWD_HASH, role: "super-admin", dept: "IT",
        jobTitle: "Chief Technology Officer", status: "Active",
        phone: "+91-9876543210", isEmployee: true, employeeId: "EES-001",
        provider: "credentials", createdAt: now, updatedAt: now
    },
    {
        _id: U_ADMIN, name: "Priya Nair", email: "admin@earthana.in",
        password: PWD_HASH, role: "admin", dept: "Operations",
        jobTitle: "Operations Manager", status: "Active",
        phone: "+91-9876543211", isEmployee: true, employeeId: "EES-002",
        provider: "credentials", createdAt: now, updatedAt: now
    },
    {
        _id: U_HR, name: "Aditya Kumar", email: "hr@earthana.in",
        password: PWD_HASH, role: "manager", dept: "Human Resources",
        jobTitle: "HR Manager", status: "Active",
        phone: "+91-9876543212", isEmployee: true, employeeId: "EES-003",
        provider: "credentials", createdAt: now, updatedAt: now
    },
    {
        _id: U_PM, name: "Sneha Patel", email: "pm@earthana.in",
        password: PWD_HASH, role: "manager", dept: "Projects",
        jobTitle: "Project Manager", status: "Active",
        phone: "+91-9876543213", isEmployee: true, employeeId: "EES-004",
        provider: "credentials", createdAt: now, updatedAt: now
    },
    {
        _id: U_STAFF1, name: "Rohan Mehta", email: "staff1@earthana.in",
        password: PWD_HASH, role: "staff", dept: "Sales",
        jobTitle: "Business Development Executive", status: "Active",
        phone: "+91-9876543214", isEmployee: true, employeeId: "EES-005",
        provider: "credentials", createdAt: now, updatedAt: now
    },
    {
        _id: U_STAFF2, name: "Kavya Reddy", email: "staff2@earthana.in",
        password: PWD_HASH, role: "staff", dept: "Finance",
        jobTitle: "Accounts Executive", status: "Active",
        phone: "+91-9876543215", isEmployee: true, employeeId: "EES-006",
        provider: "credentials", createdAt: now, updatedAt: now
    },
]);
print("✅ Users (6)");

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EMPLOYEES
// ═══════════════════════════════════════════════════════════════════════════════
db.employees.insertMany([
    {
        _id: E_SUPERADMIN, name: "Rahul Sharma", employeeId: "EES-001",
        email: "superadmin@earthana.in", phone: "+91-9876543210",
        jobTitle: "Chief Technology Officer", dept: "IT",
        employeeCategory: "Permanent", gender: "Male",
        dateOfBirth: new Date("1985-03-15"), maritalStatus: "Married",
        address: "12, Anna Nagar, Chennai - 600040",
        reportingManager: "Board of Directors",
        status: "Active",
        bankDetails: { bankName: "HDFC Bank", accountType: "Savings", accountHolderName: "Rahul Sharma", accountNumber: "XXXX1234", ifscCode: "HDFC0001234" },
        createdAt: now, updatedAt: now
    },
    {
        _id: E_ADMIN, name: "Priya Nair", employeeId: "EES-002",
        email: "admin@earthana.in", phone: "+91-9876543211",
        jobTitle: "Operations Manager", dept: "Operations",
        employeeCategory: "Permanent", gender: "Female",
        dateOfBirth: new Date("1988-07-22"), maritalStatus: "Married",
        address: "34, T. Nagar, Chennai - 600017",
        reportingManager: "Rahul Sharma",
        status: "Active",
        bankDetails: { bankName: "ICICI Bank", accountType: "Savings", accountHolderName: "Priya Nair", accountNumber: "XXXX5678", ifscCode: "ICIC0005678" },
        createdAt: now, updatedAt: now
    },
    {
        _id: E_HR, name: "Aditya Kumar", employeeId: "EES-003",
        email: "hr@earthana.in", phone: "+91-9876543212",
        jobTitle: "HR Manager", dept: "Human Resources",
        employeeCategory: "Permanent", gender: "Male",
        dateOfBirth: new Date("1990-11-05"), maritalStatus: "Single",
        address: "56, Adyar, Chennai - 600020",
        reportingManager: "Priya Nair",
        status: "Active",
        bankDetails: { bankName: "SBI", accountType: "Savings", accountHolderName: "Aditya Kumar", accountNumber: "XXXX9012", ifscCode: "SBIN0009012" },
        createdAt: now, updatedAt: now
    },
    {
        _id: E_PM, name: "Sneha Patel", employeeId: "EES-004",
        email: "pm@earthana.in", phone: "+91-9876543213",
        jobTitle: "Project Manager", dept: "Projects",
        employeeCategory: "Permanent", gender: "Female",
        dateOfBirth: new Date("1992-05-18"), maritalStatus: "Single",
        address: "78, Velachery, Chennai - 600042",
        reportingManager: "Priya Nair",
        status: "Active",
        bankDetails: { bankName: "Axis Bank", accountType: "Savings", accountHolderName: "Sneha Patel", accountNumber: "XXXX3456", ifscCode: "UTIB0003456" },
        createdAt: now, updatedAt: now
    },
    {
        _id: E_STAFF1, name: "Rohan Mehta", employeeId: "EES-005",
        email: "staff1@earthana.in", phone: "+91-9876543214",
        jobTitle: "Business Development Executive", dept: "Sales",
        employeeCategory: "Permanent", gender: "Male",
        dateOfBirth: new Date("1995-09-28"), maritalStatus: "Single",
        address: "90, Porur, Chennai - 600116",
        reportingManager: "Priya Nair",
        status: "Active",
        bankDetails: { bankName: "HDFC Bank", accountType: "Savings", accountHolderName: "Rohan Mehta", accountNumber: "XXXX7890", ifscCode: "HDFC0007890" },
        createdAt: now, updatedAt: now
    },
    {
        _id: E_STAFF2, name: "Kavya Reddy", employeeId: "EES-006",
        email: "staff2@earthana.in", phone: "+91-9876543215",
        jobTitle: "Accounts Executive", dept: "Finance",
        employeeCategory: "Permanent", gender: "Female",
        dateOfBirth: new Date("1997-01-14"), maritalStatus: "Single",
        address: "102, Tambaram, Chennai - 600045",
        reportingManager: "Priya Nair",
        status: "Active",
        bankDetails: { bankName: "Kotak Bank", accountType: "Savings", accountHolderName: "Kavya Reddy", accountNumber: "XXXX2345", ifscCode: "KKBK0002345" },
        createdAt: now, updatedAt: now
    },
]);
print("✅ Employees (6)");

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ATTENDANCE — last 7 working days for all staff
// ═══════════════════════════════════════════════════════════════════════════════
const attendanceDocs = [];
const users = [U_SUPERADMIN, U_ADMIN, U_HR, U_PM, U_STAFF1, U_STAFF2];
const attStatuses = ["Present","Present","Present","WFH","Present","Present","Present"];
for (let i = 0; i < 7; i++) {
    const day = d(-i);
    day.setHours(0,0,0,0);
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends
    for (const uid of users) {
        const punchIn = new Date(day); punchIn.setHours(9, Math.floor(Math.random()*30), 0, 0);
        const punchOut = new Date(day); punchOut.setHours(18, Math.floor(Math.random()*30), 0, 0);
        const hrs = (punchOut - punchIn) / 3600000;
        const st = attStatuses[i] || "Present";
        attendanceDocs.push({
            userId: uid, date: day,
            punchIn, punchOut,
            status: st,
            workMode: i % 3 === 2 ? "Remote" : "Office",
            hoursWorked: parseFloat(hrs.toFixed(1)),
            overtime: hrs > 9 ? parseFloat((hrs - 9).toFixed(1)) : 0,
            createdAt: punchOut, updatedAt: punchOut
        });
    }
}
if (attendanceDocs.length) { db.attendances.insertMany(attendanceDocs); }
print("✅ Attendance (" + attendanceDocs.length + " records)");

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LEAVE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════
db.leaverequests.insertMany([
    {
        userId: U_STAFF1, userName: "Rohan Mehta",
        type: "Casual", startDate: d(3), endDate: d(4),
        reason: "Personal work",
        status: "Pending",
        createdAt: now, updatedAt: now
    },
    {
        userId: U_STAFF2, userName: "Kavya Reddy",
        type: "Sick", startDate: d(-2), endDate: d(-2),
        reason: "Fever and cold",
        status: "Approved",
        approverId: U_HR, approverName: "Aditya Kumar", approverRole: "HR Manager",
        createdAt: d(-3), updatedAt: d(-2)
    },
    {
        userId: U_PM, userName: "Sneha Patel",
        type: "Festival", startDate: d(7), endDate: d(9),
        reason: "Diwali celebrations",
        status: "Approved",
        approverId: U_HR, approverName: "Aditya Kumar", approverRole: "HR Manager",
        createdAt: d(-1), updatedAt: now
    },
]);
print("✅ Leave Requests (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// 5. KPI TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
db.kpitemplates.insertMany([
    {
        _id: KPI_REVENUE, name: "Monthly Revenue", industry: "Earthana Environment Solution P.Ltd",
        subsidiary: "Earthana", department: "Sales",
        description: "Total revenue generated per month",
        unit: "INR (Lakhs)", calcMethod: "Sum", defaultTarget: "25",
        frequency: "Monthly", createdBy: U_ADMIN, createdAt: now, updatedAt: now
    },
    {
        _id: KPI_ACQRATE, name: "New Client Acquisition", industry: "Earthana Environment Solution P.Ltd",
        subsidiary: "Earthana", department: "Sales",
        description: "Number of new clients acquired per month",
        unit: "Count", calcMethod: "Sum", defaultTarget: "5",
        frequency: "Monthly", createdBy: U_ADMIN, createdAt: now, updatedAt: now
    },
    {
        _id: KPI_PROJCOMP, name: "Project Delivery Rate", industry: "Earthana Environment Solution P.Ltd",
        subsidiary: "Earthana", department: "Projects",
        description: "Percentage of projects delivered on time",
        unit: "Percentage", calcMethod: "Average", defaultTarget: "90",
        frequency: "Monthly", createdBy: U_ADMIN, createdAt: now, updatedAt: now
    },
    {
        _id: KPI_ATTEND, name: "Employee Attendance Rate", industry: "Earthana Environment Solution P.Ltd",
        subsidiary: "Earthana", department: "Human Resources",
        description: "Percentage of employees with ≥95% attendance",
        unit: "Percentage", calcMethod: "Average", defaultTarget: "95",
        frequency: "Monthly", createdBy: U_HR, createdAt: now, updatedAt: now
    },
    {
        _id: KPI_COST, name: "Operational Cost Variance", industry: "Earthana Environment Solution P.Ltd",
        subsidiary: "Earthana", department: "Finance",
        description: "Variance between budgeted and actual operating cost",
        unit: "INR (Lakhs)", calcMethod: "Latest", defaultTarget: "2",
        frequency: "Monthly", createdBy: U_ADMIN, createdAt: now, updatedAt: now
    },
]);
print("✅ KPI Templates (5)");

// ═══════════════════════════════════════════════════════════════════════════════
// 6. KPI ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════════
db.kpiassignments.insertMany([
    {
        kpiTemplateId: KPI_REVENUE, kpiTemplateName: "Monthly Revenue",
        assignedTo: U_STAFF1, assignedToName: "Rohan Mehta",
        department: "Sales", subsidiary: "Earthana",
        targetValue: "20", unit: "INR (Lakhs)", frequency: "Monthly",
        period: "June 2026", status: "Active",
        createdBy: U_ADMIN, createdAt: now, updatedAt: now
    },
    {
        kpiTemplateId: KPI_PROJCOMP, kpiTemplateName: "Project Delivery Rate",
        assignedTo: U_PM, assignedToName: "Sneha Patel",
        department: "Projects", subsidiary: "Earthana",
        targetValue: "90", unit: "Percentage", frequency: "Monthly",
        period: "June 2026", status: "Active",
        createdBy: U_ADMIN, createdAt: now, updatedAt: now
    },
    {
        kpiTemplateId: KPI_ATTEND, kpiTemplateName: "Employee Attendance Rate",
        assignedTo: U_HR, assignedToName: "Aditya Kumar",
        department: "Human Resources", subsidiary: "Earthana",
        targetValue: "95", unit: "Percentage", frequency: "Monthly",
        period: "June 2026", status: "Active",
        createdBy: U_ADMIN, createdAt: now, updatedAt: now
    },
]);
print("✅ KPI Assignments (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// 7. KPI ENTRIES
// ═══════════════════════════════════════════════════════════════════════════════
db.kpientries.insertMany([
    {
        kpiTemplateId: KPI_REVENUE, submittedBy: U_STAFF1,
        period: "May 2026", value: "18.5", notes: "Strong month — 3 new accounts",
        status: "Approved", createdAt: d(-30), updatedAt: d(-28)
    },
    {
        kpiTemplateId: KPI_REVENUE, submittedBy: U_STAFF1,
        period: "June 2026", value: "14.2", notes: "Mid-month, pipeline healthy",
        status: "Pending", createdAt: d(-3), updatedAt: d(-3)
    },
    {
        kpiTemplateId: KPI_PROJCOMP, submittedBy: U_PM,
        period: "May 2026", value: "87", notes: "Two projects slightly delayed due to material delay",
        status: "Approved", createdAt: d(-30), updatedAt: d(-28)
    },
    {
        kpiTemplateId: KPI_ATTEND, submittedBy: U_HR,
        period: "May 2026", value: "96.4", notes: "Good attendance overall",
        status: "Approved", createdAt: d(-30), updatedAt: d(-28)
    },
    {
        kpiTemplateId: KPI_ATTEND, submittedBy: U_HR,
        period: "June 2026", value: "97.1", notes: "Excellent — no unexplained absences",
        status: "Pending", createdAt: d(-1), updatedAt: d(-1)
    },
]);
print("✅ KPI Entries (5)");

// ═══════════════════════════════════════════════════════════════════════════════
// 8. GOALS
// ═══════════════════════════════════════════════════════════════════════════════
db.goals.insertMany([
    {
        _id: GOAL_REV, title: "Q2 FY26 Revenue Target",
        description: "Achieve ₹75 Lakhs revenue across all subsidiaries in Q2 FY2026",
        subsidiary: "Earthana", fiscalPeriod: "Q2 FY2026",
        department: "Sales", assignedTo: U_STAFF1, assignedToModel: "User",
        startDate: new Date("2026-04-01"), endDate: new Date("2026-06-30"),
        targetValue: "75", currentValue: "52.7", metric: "INR Lakhs",
        status: "In Progress", progress: 70, priority: "High",
        kpiTemplates: [KPI_REVENUE], createdBy: U_ADMIN,
        createdAt: new Date("2026-04-01"), updatedAt: d(-1)
    },
    {
        _id: GOAL_HR, title: "Workforce Expansion FY26",
        description: "Hire 8 new professionals across departments by end of FY2026",
        subsidiary: "Earthana", fiscalPeriod: "FY2026",
        department: "Human Resources", assignedTo: U_HR, assignedToModel: "User",
        startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        targetValue: "8", currentValue: "3", metric: "Hires",
        status: "In Progress", progress: 38, priority: "Medium",
        kpiTemplates: [], createdBy: U_HR,
        createdAt: new Date("2026-01-05"), updatedAt: d(-7)
    },
    {
        _id: GOAL_GREEN, title: "ISO 14001 Certification",
        description: "Achieve ISO 14001 Environmental Management System certification",
        subsidiary: "Earthana", fiscalPeriod: "FY26 H1",
        department: "Projects", assignedTo: U_PM, assignedToModel: "User",
        startDate: new Date("2026-03-01"), endDate: new Date("2026-09-30"),
        targetValue: "1", currentValue: "0", metric: "Certification",
        status: "In Progress", progress: 45, priority: "High",
        kpiTemplates: [KPI_PROJCOMP], createdBy: U_ADMIN,
        createdAt: new Date("2026-03-01"), updatedAt: d(-5)
    },
]);
print("✅ Goals (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// 9. CONTACTS
// ═══════════════════════════════════════════════════════════════════════════════
db.contacts.insertMany([
    {
        _id: CON_TF, name: "Vikram Sharma", email: "vikram@techflow.in",
        phone: "+91-9800001111", company: "TechFlow Systems Pvt Ltd",
        type: "Client", status: "Active",
        address: "45, IT Corridor, SIPCOT, Chennai",
        gstin: "33AABCT1234Q1Z5",
        notes: "Key account — ERP implementation client",
        createdAt: d(-60), updatedAt: d(-15)
    },
    {
        _id: CON_APEX, name: "Meera Iyer", email: "meera@apexelec.com",
        phone: "+91-9800002222", company: "Apex Electrical Contractors",
        type: "Vendor", status: "Active",
        address: "12, Industrial Estate, Ambattur, Chennai",
        category: "Electrical",
        notes: "Primary electrical subcontractor for site works",
        createdAt: d(-45), updatedAt: d(-10)
    },
    {
        _id: CON_GW, name: "Suresh Babu", email: "suresh@gridwise.in",
        phone: "+91-9800003333", company: "Gridwise Energy Solutions",
        type: "Partner", status: "Active",
        address: "78, Solar Park, Oragadam, Chennai",
        notes: "Strategic partner for solar and renewable energy projects",
        createdAt: d(-90), updatedAt: d(-5)
    },
    {
        _id: CON_GB, name: "Anita Menon", email: "anita@greenbuild.co.in",
        phone: "+91-9800004444", company: "GreenBuild Corp",
        type: "Client", status: "Active",
        address: "56, Green Avenue, Nungambakkam, Chennai",
        gstin: "33AABCG5678R1Z2",
        notes: "Prospect for sustainable construction advisory",
        createdAt: d(-30), updatedAt: d(-2)
    },
    {
        _id: CON_RAVI, name: "Ravi Kumar", email: "ravi@raviworks.com",
        phone: "+91-9800005555", company: "Ravi Civil Works",
        type: "Vendor", status: "Active",
        address: "23, Perambur, Chennai - 600011",
        category: "Civil Works",
        notes: "Trusted civil contractor — 3+ years relationship",
        createdAt: d(-120), updatedAt: d(-20)
    },
]);
print("✅ Contacts (5)");

// ═══════════════════════════════════════════════════════════════════════════════
// 10. LEADS
// ═══════════════════════════════════════════════════════════════════════════════
db.leads.insertMany([
    {
        _id: LEAD_TF, name: "Vikram Sharma", company: "TechFlow Systems Pvt Ltd",
        email: "vikram@techflow.in", phone: "+91-9800001111",
        contactId: CON_TF.toString(),
        status: "Qualified", source: "Referral",
        value: 850000, probability: 75,
        notes: "Interested in full ERP implementation + training",
        remarks: [
            { status: "Contacted", note: "Initial call — very positive response", date: d(-45) },
            { status: "Qualified", note: "Demo done, budget confirmed ₹8.5L", date: d(-30) }
        ],
        createdAt: d(-50), updatedAt: d(-10)
    },
    {
        _id: LEAD_GB, name: "Anita Menon", company: "GreenBuild Corp",
        email: "anita@greenbuild.co.in", phone: "+91-9800004444",
        status: "New", source: "Website",
        value: 350000, probability: 20,
        notes: "Inquired about sustainability advisory services",
        createdAt: d(-7), updatedAt: d(-7)
    },
    {
        _id: LEAD_APEX, name: "Deepak Nair", company: "Apex Industries Ltd",
        email: "deepak@apexind.com", phone: "+91-9800006666",
        status: "Contacted", source: "Exhibition",
        value: 1200000, probability: 40,
        notes: "Met at GreenEx 2026 — interested in carbon audit services",
        remarks: [
            { status: "Contacted", note: "Follow-up call scheduled", date: d(-15) }
        ],
        createdAt: d(-20), updatedAt: d(-15)
    },
    {
        _id: LEAD_ECO, name: "Pradeep Raj", company: "EcoTech Solutions",
        email: "pradeep@ecotech.io", phone: "+91-9800007777",
        status: "New", source: "LinkedIn",
        value: 500000, probability: 15,
        notes: "Inbound lead — IoT environmental monitoring",
        createdAt: d(-3), updatedAt: d(-3)
    },
]);
print("✅ Leads (4)");

// ═══════════════════════════════════════════════════════════════════════════════
// 11. DEALS
// ═══════════════════════════════════════════════════════════════════════════════
db.deals.insertMany([
    {
        _id: DEAL_ERP, title: "ERP Implementation — TechFlow Systems",
        client: "TechFlow Systems Pvt Ltd", value: 850000,
        stage: "Negotiation", probability: 75,
        expectedCloseDate: d(15),
        owner: "Rohan Mehta",
        createdAt: d(-30), updatedAt: d(-5)
    },
    {
        _id: DEAL_SOLAR, title: "Solar Panel Installation — Gridwise Project",
        client: "Gridwise Energy Solutions", value: 2500000,
        stage: "Proposal", probability: 55,
        expectedCloseDate: d(30),
        owner: "Rohan Mehta",
        createdAt: d(-20), updatedAt: d(-3)
    },
    {
        _id: DEAL_FITOUT, title: "Office Fitout Consulting — Rudra Studio",
        client: "Rudra Architecture Studio", value: 450000,
        stage: "Qualified", probability: 65,
        expectedCloseDate: d(10),
        owner: "Rohan Mehta",
        createdAt: d(-10), updatedAt: d(-1)
    },
]);
print("✅ Deals (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// 12. PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════
db.projects.insertMany([
    {
        _id: PROJ_ERP, name: "Vrone ERP Internal Rollout",
        client: "Earthana Corporate", description: "Full rollout of ERP across all subsidiaries",
        status: "In Progress", priority: "High",
        startDate: new Date("2026-04-01"), endDate: new Date("2026-09-30"),
        progress: 55, budget: 500000,
        teamMembers: [U_SUPERADMIN, U_ADMIN, U_PM],
        template: "IT Implementation", completedStageIds: [],
        createdAt: new Date("2026-04-01"), updatedAt: d(-2)
    },
    {
        _id: PROJ_SOLAR, name: "Gridwise Solar Installation — Phase 1",
        client: "Gridwise Energy Solutions", description: "50kW rooftop solar panel installation across 3 sites in Chennai",
        status: "Planning", priority: "High",
        startDate: d(5), endDate: d(95),
        progress: 10, budget: 2800000,
        teamMembers: [U_PM, U_STAFF1],
        template: "Site Installation", completedStageIds: [],
        createdAt: d(-5), updatedAt: d(-1)
    },
    {
        _id: PROJ_FITOUT, name: "Rudra Architecture Studio Office Fitout",
        client: "Rudra Architecture Studio", description: "Interior fitout and sustainability audit for new studio space",
        status: "In Progress", priority: "Medium",
        startDate: d(-20), endDate: d(40),
        progress: 35, budget: 650000,
        teamMembers: [U_PM, U_ADMIN],
        template: "Design & Build", completedStageIds: [],
        createdAt: d(-25), updatedAt: d(-1)
    },
]);
print("✅ Projects (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// 13. PROJECT STAGE TASKS
// ═══════════════════════════════════════════════════════════════════════════════
db.projectstagetasks.insertMany([
    {
        projectId: PROJ_ERP.toString(), stageId: "stage-1",
        title: "Requirements Gathering", description: "Gather requirements from all department heads",
        assignedTo: U_ADMIN.toString(), assignedToName: "Priya Nair",
        priority: "High", status: "Completed",
        dueDate: d(-30), completedAt: d(-32),
        createdAt: d(-45), updatedAt: d(-32)
    },
    {
        projectId: PROJ_ERP.toString(), stageId: "stage-1",
        title: "System Architecture Design", description: "Design DB schema and module architecture",
        assignedTo: U_SUPERADMIN.toString(), assignedToName: "Rahul Sharma",
        priority: "Critical", status: "Completed",
        dueDate: d(-20), completedAt: d(-22),
        createdAt: d(-45), updatedAt: d(-22)
    },
    {
        projectId: PROJ_ERP.toString(), stageId: "stage-2",
        title: "HR Module Development", description: "Build employee, attendance and leave modules",
        assignedTo: U_SUPERADMIN.toString(), assignedToName: "Rahul Sharma",
        priority: "High", status: "In Progress",
        dueDate: d(5),
        createdAt: d(-20), updatedAt: d(-2)
    },
    {
        projectId: PROJ_ERP.toString(), stageId: "stage-2",
        title: "User Training — Phase 1", description: "Train all department leads on core modules",
        assignedTo: U_HR.toString(), assignedToName: "Aditya Kumar",
        priority: "Medium", status: "Not Started",
        dueDate: d(15),
        createdAt: d(-10), updatedAt: d(-10)
    },
    {
        projectId: PROJ_SOLAR.toString(), stageId: "stage-1",
        title: "Site Survey — Oragadam", description: "Conduct rooftop area survey and structural assessment",
        assignedTo: U_PM.toString(), assignedToName: "Sneha Patel",
        priority: "High", status: "In Progress",
        dueDate: d(3),
        createdAt: d(-3), updatedAt: d(-1)
    },
    {
        projectId: PROJ_FITOUT.toString(), stageId: "stage-1",
        title: "Interior Design Finalization", description: "Approve final interior layout drawings",
        assignedTo: U_PM.toString(), assignedToName: "Sneha Patel",
        priority: "High", status: "Completed",
        dueDate: d(-10), completedAt: d(-12),
        createdAt: d(-20), updatedAt: d(-12)
    },
    {
        projectId: PROJ_FITOUT.toString(), stageId: "stage-2",
        title: "Civil Work — Partitions", description: "Install drywall partitions as per approved plan",
        assignedTo: U_ADMIN.toString(), assignedToName: "Priya Nair",
        priority: "Medium", status: "In Progress",
        dueDate: d(7),
        createdAt: d(-8), updatedAt: d(-1)
    },
]);
print("✅ Project Stage Tasks (7)");

// ═══════════════════════════════════════════════════════════════════════════════
// 14. PRODUCTS (Inventory)
// ═══════════════════════════════════════════════════════════════════════════════
db.products.insertMany([
    {
        _id: PROD_SENSOR, name: "Air Quality Sensor Unit", sku: "AQS-001",
        category: "Environmental Monitoring", quantity: 24, minLevel: 5,
        price: 12500, description: "Real-time PM2.5, CO2 and VOC monitoring sensor",
        status: "Active", createdAt: d(-90), updatedAt: d(-5)
    },
    {
        _id: PROD_SOLAR, name: "Solar Panel 300W Monocrystalline", sku: "SP-300M",
        category: "Renewable Energy", quantity: 120, minLevel: 20,
        price: 8500, description: "High efficiency 300W solar panel for rooftop installation",
        status: "Active", createdAt: d(-60), updatedAt: d(-3)
    },
    {
        _id: PROD_LOGGER, name: "Environmental Data Logger", sku: "DL-ENV-02",
        category: "Environmental Monitoring", quantity: 8, minLevel: 3,
        price: 35000, description: "Multi-channel data logger for environmental parameters",
        status: "Active", createdAt: d(-45), updatedAt: d(-10)
    },
    {
        _id: PROD_SW, name: "Vrone Monitor — Software License (Annual)", sku: "SW-VM-ANNU",
        category: "Software", quantity: 15, minLevel: 2,
        price: 18000, description: "Annual license for environmental monitoring dashboard",
        status: "Active", createdAt: d(-30), updatedAt: d(-7)
    },
    {
        _id: PROD_SAFETY, name: "Site Safety Equipment Kit", sku: "SAF-KIT-01",
        category: "Safety", quantity: 3, minLevel: 5,
        price: 4500, description: "Standard PPE kit for field work",
        status: "Active", createdAt: d(-120), updatedAt: d(-1)
    },
    {
        _id: PROD_CARBON, name: "Carbon Offset Credit Certificate", sku: "CO-CERT-01",
        category: "Environmental Credits", quantity: 50, minLevel: 10,
        price: 1200, description: "Verified carbon offset credit — 1 tonne CO2",
        status: "Active", createdAt: d(-15), updatedAt: d(-2)
    },
]);
print("✅ Products/Inventory (6)");

// ═══════════════════════════════════════════════════════════════════════════════
// 15. PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════════════════
db.purchaseorders.insertMany([
    {
        _id: PO_1, poNumber: "PO-2026-001",
        vendor: "Apex Electrical Contractors",
        date: d(-15),
        items: [
            { description: "Electrical conduit pipes (20m)", quantity: 50, rate: 180, amount: 9000 },
            { description: "MCB Distribution Board 32A", quantity: 5, rate: 2800, amount: 14000 },
        ],
        totalValue: 23000, status: "Sent",
        deliveryDate: d(5),
        notes: "Urgent — for Fitout project",
        createdAt: d(-15), updatedAt: d(-14)
    },
    {
        _id: PO_2, poNumber: "PO-2026-002",
        vendor: "Ravi Civil Works",
        date: d(-8),
        items: [
            { description: "Drywall panels 12mm", quantity: 80, rate: 450, amount: 36000 },
            { description: "Metal studs and tracks", quantity: 200, rate: 85, amount: 17000 },
        ],
        totalValue: 53000, status: "Draft",
        deliveryDate: d(10),
        notes: "Rudra Fitout — Phase 2 materials",
        createdAt: d(-8), updatedAt: d(-8)
    },
    {
        _id: PO_3, poNumber: "PO-2026-003",
        vendor: "TechParts India Pvt Ltd",
        date: d(-30),
        items: [
            { description: "Air Quality Sensor Unit AQS-001", quantity: 10, rate: 11000, amount: 110000 },
            { description: "Environmental Data Logger DL-ENV-02", quantity: 3, rate: 32000, amount: 96000 },
        ],
        totalValue: 206000, status: "Completed",
        deliveryDate: d(-10),
        notes: "Inventory restock — Q2",
        createdAt: d(-30), updatedAt: d(-10)
    },
]);
print("✅ Purchase Orders (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// 16. INVOICES
// ═══════════════════════════════════════════════════════════════════════════════
db.invoices.insertMany([
    {
        _id: INV_1, invoiceId: "INV-2026-001",
        client: "TechFlow Systems Pvt Ltd",
        issueDate: d(-20), dueDate: d(-5),
        amount: 120000, status: "Paid",
        createdAt: d(-20), updatedAt: d(-6)
    },
    {
        _id: INV_2, invoiceId: "INV-2026-002",
        client: "GreenBuild Corp",
        issueDate: d(-10), dueDate: d(5),
        amount: 85000, status: "Unpaid",
        createdAt: d(-10), updatedAt: d(-10)
    },
    {
        _id: INV_3, invoiceId: "INV-2026-003",
        client: "Gridwise Energy Solutions",
        issueDate: d(-35), dueDate: d(-5),
        amount: 250000, status: "Paid",
        createdAt: d(-35), updatedAt: d(-7)
    },
    {
        _id: INV_4, invoiceId: "INV-2026-004",
        client: "Apex Industries Ltd",
        issueDate: d(-40), dueDate: d(-10),
        amount: 45000, status: "Overdue",
        createdAt: d(-40), updatedAt: d(-10)
    },
]);
print("✅ Invoices (4)");

// ═══════════════════════════════════════════════════════════════════════════════
// 17. BANK ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════
db.bankaccounts.insertMany([
    {
        _id: BANK_HDFC, bankName: "HDFC Bank",
        accountName: "Earthana Main Operational Account",
        accountNumber: "50100123456789", accountType: "Current",
        branch: "Little Mount, Chennai", ifscCode: "HDFC0001234",
        openingBalance: 1000000, currentBalance: 1245000,
        currency: "INR", isActive: true,
        createdAt: d(-365), updatedAt: d(-1)
    },
    {
        _id: BANK_SBI, bankName: "State Bank of India",
        accountName: "Earthana Savings — Payroll Account",
        accountNumber: "38765432109876", accountType: "Savings",
        branch: "Saidapet, Chennai", ifscCode: "SBIN0009876",
        openingBalance: 500000, currentBalance: 550000,
        currency: "INR", isActive: true,
        createdAt: d(-200), updatedAt: d(-5)
    },
]);
print("✅ Bank Accounts (2)");

// ═══════════════════════════════════════════════════════════════════════════════
// 18. PETTY CASH TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════
db.pettycashtransactions.insertMany([
    {
        subsidiary: "Earthana", location: "Corporate Office, Saidapet",
        type: "Expense", party: "Higginbothams — Office Stationery",
        category: "Office Supplies", reference: "PCT-2026-001",
        date: d(-10), amount: 2500,
        paymentMode: "Cash", status: "Approved",
        approvedBy: U_ADMIN, approvalDate: d(-9),
        createdBy: U_STAFF2, createdAt: d(-10), updatedAt: d(-9)
    },
    {
        subsidiary: "Earthana", location: "Corporate Office, Saidapet",
        type: "Expense", party: "GRT Grand Restaurant — Client Lunch",
        category: "Client Entertainment", reference: "PCT-2026-002",
        date: d(-7), amount: 8500,
        paymentMode: "Credit Card", bankAccount: "Earthana Main Operational Account",
        status: "Approved",
        approvedBy: U_ADMIN, approvalDate: d(-6),
        createdBy: U_STAFF1, createdAt: d(-7), updatedAt: d(-6)
    },
    {
        subsidiary: "Gridwise", location: "Gridwise Site — Oragadam",
        type: "Expense", party: "IRCTC — Train Tickets",
        category: "Travel & Transport", reference: "PCT-2026-003",
        date: d(-5), amount: 4200,
        paymentMode: "UPI", status: "Approved",
        approvedBy: U_ADMIN, approvalDate: d(-4),
        createdBy: U_PM, createdAt: d(-5), updatedAt: d(-4)
    },
    {
        subsidiary: "Earthana", location: "Corporate Office, Saidapet",
        type: "Income", party: "TechFlow Systems — Advance",
        category: "Client Advance", reference: "PCT-2026-004",
        date: d(-3), amount: 50000,
        paymentMode: "NEFT", bankAccount: "Earthana Main Operational Account",
        status: "Approved",
        approvedBy: U_ADMIN, approvalDate: d(-2),
        createdBy: U_STAFF2, createdAt: d(-3), updatedAt: d(-2)
    },
    {
        subsidiary: "Rudra Architechture Studio", location: "Rudra Studio, Nungambakkam",
        type: "Expense", party: "Amazon Business — Stationery",
        category: "Office Supplies", reference: "PCT-2026-005",
        date: d(-1), amount: 1800,
        paymentMode: "Online Transfer", status: "Pending",
        createdBy: U_STAFF2, createdAt: d(-1), updatedAt: d(-1)
    },
    {
        subsidiary: "Earthana", location: "Corporate Office, Saidapet",
        type: "Expense", party: "BSNL — Internet Bill June",
        category: "Utilities", reference: "PCT-2026-006",
        date: d(-2), amount: 3200,
        paymentMode: "Online Transfer", bankAccount: "Earthana Savings — Payroll Account",
        status: "Approved",
        approvedBy: U_ADMIN, approvalDate: d(-1),
        createdBy: U_STAFF2, createdAt: d(-2), updatedAt: d(-1)
    },
]);
print("✅ Petty Cash Transactions (6)");

// ═══════════════════════════════════════════════════════════════════════════════
// 19. ASSETS
// ═══════════════════════════════════════════════════════════════════════════════
db.assets.insertMany([
    {
        _id: ASSET_LAPTOP1, name: "Dell Latitude 5540 — Rahul Sharma",
        category: "Laptop", modelNo: "Latitude 5540",
        serialNo: "DELL-5540-RS001",
        purchaseDate: new Date("2024-06-01"), purchasePrice: 95000,
        currentValue: 71250,
        status: "Assigned", assignedTo: U_SUPERADMIN,
        assignedDate: new Date("2024-06-05"),
        warrantyExpiry: new Date("2027-06-01"),
        location: "Corporate Office",
        createdBy: U_ADMIN, createdAt: new Date("2024-06-05"), updatedAt: d(-30)
    },
    {
        _id: ASSET_MAC, name: "Apple MacBook Pro 14\" M3",
        category: "Laptop", modelNo: "MacBook Pro 14 M3",
        serialNo: "APPLE-MBP-002",
        purchaseDate: new Date("2025-01-15"), purchasePrice: 195000,
        currentValue: 175000,
        status: "Assigned", assignedTo: U_PM,
        assignedDate: new Date("2025-01-20"),
        warrantyExpiry: new Date("2026-01-15"),
        location: "Corporate Office",
        createdBy: U_ADMIN, createdAt: new Date("2025-01-20"), updatedAt: d(-15)
    },
    {
        _id: ASSET_CAR, name: "Toyota Innova Crysta — Field Vehicle",
        category: "Vehicle", modelNo: "Innova Crysta 2.4 GX",
        serialNo: "TN09AB1234",
        purchaseDate: new Date("2023-03-01"), purchasePrice: 2200000,
        currentValue: 1650000,
        status: "Assigned", assignedTo: U_PM,
        assignedDate: new Date("2023-03-10"),
        location: "Corporate Parking",
        createdBy: U_ADMIN, createdAt: new Date("2023-03-10"), updatedAt: d(-60)
    },
    {
        _id: ASSET_MON, name: "LG 27\" 4K Monitor (x2)",
        category: "Monitor", modelNo: "LG 27UK850-W",
        serialNo: "LG-MON-003",
        purchaseDate: new Date("2025-06-01"), purchasePrice: 55000,
        currentValue: 48000,
        status: "Available",
        warrantyExpiry: new Date("2028-06-01"),
        location: "IT Storage Room",
        createdBy: U_ADMIN, createdAt: new Date("2025-06-10"), updatedAt: d(-10)
    },
]);
print("✅ Assets (4)");

// ═══════════════════════════════════════════════════════════════════════════════
// 20. CAMPAIGNS (Marketing)
// ═══════════════════════════════════════════════════════════════════════════════
db.campaigns.insertMany([
    {
        _id: CAMP_SM, name: "Earthana Green Week — Social Push",
        type: "Social Media", status: "Active",
        budget: 75000, spent: 42000,
        startDate: d(-7), endDate: d(7),
        metrics: { clicks: 3420, impressions: 48500, conversions: 87, roi: 2.8 },
        createdAt: d(-10), updatedAt: d(-1)
    },
    {
        _id: CAMP_EM, name: "Q2 Lead Generation — Email Blast",
        type: "Email", status: "Active",
        budget: 25000, spent: 18500,
        startDate: d(-20), endDate: d(10),
        metrics: { clicks: 1240, impressions: 8900, conversions: 34, roi: 3.5 },
        createdAt: d(-22), updatedAt: d(-2)
    },
    {
        _id: CAMP_OFF, name: "GreenEx 2026 — Exhibition Presence",
        type: "Offline", status: "Completed",
        budget: 150000, spent: 142000,
        startDate: d(-45), endDate: d(-40),
        metrics: { clicks: 0, impressions: 2200, conversions: 12, roi: 1.9 },
        createdAt: d(-50), updatedAt: d(-40)
    },
]);
print("✅ Campaigns (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// 21. WORK ORDERS
// ═══════════════════════════════════════════════════════════════════════════════
db.workorders.insertMany([
    {
        _id: WO_1, title: "Server Room AC Maintenance",
        type: "Vendor", project: "Earthana Corporate — Facilities",
        priority: "High", status: "Open",
        assignee: "CoolTech HVAC Services",
        date: d(-2), location: "Corporate Office — Server Room",
        cost: 8500, description: "Annual maintenance of precision AC units in server room",
        createdAt: d(-2), updatedAt: d(-2)
    },
    {
        _id: WO_2, title: "Rudra Studio — False Ceiling Installation",
        type: "Vendor", project: "Rudra Architecture Studio Office Fitout",
        priority: "Medium", status: "In Progress",
        assignee: "Ravi Civil Works",
        date: d(-5), location: "Rudra Studio, Nungambakkam",
        cost: 35000, description: "Install gypsum false ceiling as per design drawings",
        createdAt: d(-8), updatedAt: d(-2)
    },
    {
        _id: WO_3, title: "Solar Panel Mounting Frame Fabrication",
        type: "Internal", project: "Gridwise Solar Installation — Phase 1",
        priority: "Critical", status: "Open",
        assignee: "Sneha Patel",
        date: d(3), location: "Oragadam Site",
        cost: 18000, description: "Fabricate and install galvanised mounting frames for 120 panels",
        createdAt: d(-1), updatedAt: d(-1)
    },
]);
print("✅ Work Orders (3)");

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
print("\n═══════════════════════════════════════════");
print("  Seed Complete — Vrone ERP Dev Database");
print("═══════════════════════════════════════════");
const cols = ["users","employees","attendances","leaverequests","kpitemplates",
              "kpiassignments","kpientries","goals","contacts","leads","deals",
              "projects","projectstagetasks","products","purchaseorders","invoices",
              "bankaccounts","pettycashtransactions","assets","campaigns","workorders"];
cols.forEach(c => print("  " + c.padEnd(22) + db[c].countDocuments()));
print("\n  Login with: superadmin@earthana.in / Earthana@2024");
print("  Or any of: admin, hr, pm, staff1, staff2 @earthana.in\n");
