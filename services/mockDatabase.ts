import { INITIAL_DISPOSAL_REQUESTS, INITIAL_REPAIRS, INITIAL_TECHNICIANS, INITIAL_USERS, INITIAL_VIOLATIONS } from '../constants';
import { DisposalRequest, RepairCategory, RepairRequest, RepairStatus, Technician, User, UserRole, VerificationStatus, Violation } from '../types';

// This class simulates the Java Backend Service Layer
class MockDatabaseService {
  private users = [...INITIAL_USERS];
  private technicians = [...INITIAL_TECHNICIANS];
  private repairs = [...INITIAL_REPAIRS];
  private disposals = [...INITIAL_DISPOSAL_REQUESTS];
  private violations = [...INITIAL_VIOLATIONS];

  // --- Auth ---
  login(role: UserRole): User {
    const user = this.users.find(u => u.role === role);
    
    if (user) {
        if (user.role === UserRole.TECHNICIAN && user.verificationStatus === VerificationStatus.PENDING) {
            throw new Error("Thank you for signing up, your Technician application is in review, please await an email");
        }
        if (user.status === 'SUSPENDED') throw new Error("Account Suspended. Contact Admin.");
        return user;
    }

    throw new Error("User not found. Please register.");
  }

  // Used for specific email logins
  loginByEmail(email: string): User {
      const user = this.users.find(u => u.email === email);
      if (!user) throw new Error("Invalid credentials");
      
      if (user.role === UserRole.TECHNICIAN && user.verificationStatus === VerificationStatus.PENDING) {
          throw new Error("Thank you for signing up, your Technician application is in review, please await an email");
      }
      return user;
  }

  registerUser(data: Partial<User> & { specialty?: RepairCategory; experience?: number }): User {
    const isTechnician = data.role === UserRole.TECHNICIAN;
    const newId = `u${Date.now()}`;
    
    const newUser: User = {
      id: newId,
      name: data.name || 'Unknown User',
      emirate: data.emirate || 'Dubai',
      address: data.address || '',
      role: data.role || UserRole.CITIZEN,
      points: 0,
      repairsCount: 0,
      status: 'ACTIVE',
      verificationStatus: isTechnician ? VerificationStatus.PENDING : VerificationStatus.VERIFIED,
      email: data.email,
      phone: data.phone,
      emiratesId: data.emiratesId
    };
    
    this.users.push(newUser);

    if (isTechnician) {
      const newTech: Technician = {
        id: newId, 
        name: data.name || 'Unknown Tech',
        emiratesId: data.emiratesId || '',
        specialty: data.specialty ? [data.specialty] : [RepairCategory.OTHER],
        verificationStatus: VerificationStatus.PENDING,
        rating: 0,
        activeJobs: 0,
        completedJobs: 0,
        joinDate: new Date().toISOString().split('T')[0]
      };
      this.technicians.push(newTech);
    }

    return newUser;
  }

  updateUser(userId: string, data: Partial<User>): User {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("User not found");
    this.users[index] = { ...this.users[index], ...data };
    return this.users[index];
  }

  // --- User Management (Admin) ---
  getAllUsers(): User[] {
    return this.users.filter(u => u.role !== UserRole.ADMIN);
  }

  updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): void {
    this.users = this.users.map(u => u.id === userId ? { ...u, status } : u);
  }

  // --- Technician Management ---
  getAllTechnicians(): Technician[] {
    return this.technicians;
  }

  getRepairsByTechnician(techId: string): RepairRequest[] {
    // Only return jobs specifically assigned to this tech
    return this.repairs.filter(r => r.technicianId === techId);
  }

  // NEW: Get jobs available for a specific technician to accept
  getOpenRepairs(specialties: RepairCategory[]): RepairRequest[] {
      return this.repairs.filter(r => 
          r.status === RepairStatus.PENDING && 
          !r.technicianId &&
          (specialties.includes(r.category))
      );
  }

  // NEW: Technician accepts a job
  acceptRepair(repairId: string, techId: string, techName: string): void {
      const index = this.repairs.findIndex(r => r.id === repairId);
      if (index === -1) throw new Error("Repair request not found");
      
      if (this.repairs[index].status !== RepairStatus.PENDING) {
          throw new Error("This job is no longer available.");
      }

      this.repairs[index] = {
          ...this.repairs[index],
          status: RepairStatus.ASSIGNED, // Or IN_PROGRESS depending on workflow
          technicianId: techId,
          technicianName: techName
      };

      this.updateTechnicianJobCount(techId, 1);
  }

  submitTechnicianApplication(name: string, emiratesId: string, specialty: string, experience: number): void {
     this.registerUser({
         name,
         emiratesId,
         role: UserRole.TECHNICIAN,
         email: `tech${Date.now()}@test.com`, 
         specialty: specialty as RepairCategory,
         experience: experience
     });
  }

  verifyTechnician(techId: string, status: VerificationStatus): void {
    this.technicians = this.technicians.map(t => t.id === techId ? { ...t, verificationStatus: status } : t);
    this.users = this.users.map(u => u.id === techId ? { ...u, verificationStatus: status } : u);
  }

  // --- Repair Management ---
  getRepairs(userId?: string): RepairRequest[] {
    if (userId) {
      return this.repairs.filter(r => r.userId === userId);
    }
    return this.repairs;
  }

  getAllRepairs(): RepairRequest[] {
    return this.repairs;
  }

  updateRepairStatus(repairId: string, status: RepairStatus): void {
    this.repairs = this.repairs.map(r => r.id === repairId ? { ...r, status } : r);
  }

  createRepair(request: Omit<RepairRequest, 'id' | 'status' | 'dateCreated'>): RepairRequest {
    const newRepair: RepairRequest = {
      ...request,
      id: `r${Date.now()}`,
      status: RepairStatus.PENDING,
      dateCreated: new Date().toISOString().split('T')[0],
      // No technician ID assigned initially
    };
    
    // REMOVED AUTO-ASSIGN LOGIC
    // The repair sits in PENDING state until a technician picks it up.

    this.repairs = [newRepair, ...this.repairs];
    return newRepair;
  }

  private updateTechnicianJobCount(techId: string, increment: number) {
    this.technicians = this.technicians.map(t => 
      t.id === techId ? { ...t, activeJobs: t.activeJobs + increment } : t
    );
  }

  // --- Disposal & Violations ---
  getDisposalRequests(): DisposalRequest[] {
    return this.disposals;
  }

  updateDisposalStatus(id: string, status: DisposalRequest['status']): void {
    this.disposals = this.disposals.map(d => d.id === id ? { ...d, status } : d);
  }

  getViolations(): Violation[] {
    return this.violations;
  }

  issueViolation(userId: string, userName: string, type: string, amount: number): void {
    const newViolation: Violation = {
      id: `v${Date.now()}`,
      userId,
      userName,
      type,
      fineAmount: amount,
      date: new Date().toISOString().split('T')[0],
      status: 'UNPAID'
    };
    this.violations = [newViolation, ...this.violations];
  }

  // --- Analytics ---
  getStats() {
    const totalRepairs = this.repairs.length;
    const completed = this.repairs.filter(r => r.status === RepairStatus.COMPLETED).length;
    const failed = this.repairs.filter(r => r.status === RepairStatus.FAILED || r.status === RepairStatus.REJECTED).length;
    
    const landfillDivertedKg = completed * 15;

    return {
      totalRepairs,
      completedRepairs: completed,
      failedRepairs: failed,
      activeTechnicians: this.technicians.filter(t => t.verificationStatus === VerificationStatus.VERIFIED).length,
      pendingTechnicians: this.technicians.filter(t => t.verificationStatus === VerificationStatus.PENDING).length,
      totalUsers: this.users.length - 1, // Exclude admin
      landfillDivertedKg,
      avgCompletionTime: '6.5 hours',
      complianceRate: '92%'
    };
  }
}

export const db = new MockDatabaseService();