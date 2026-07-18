import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from './firebase';
import { 
  Teacher, 
  SchoolYear, 
  ClassItem, 
  Student, 
  ViolationRecord, 
  ViolationType, 
  WeeklyPlan, 
  StudentTask, 
  AcademicUpdate,
  SheetSyncConfig,
  SystemUser,
  Announcement
} from '../types';

// Helper to check if a collection is empty
export async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.empty;
}

// Global seeding function
export async function seedFirestore(data: {
  teachers: Teacher[];
  schoolYears: SchoolYear[];
  classes: ClassItem[];
  students: Student[];
  violations: ViolationRecord[];
  violationTypes: ViolationType[];
  plans: WeeklyPlan[];
  tasks: StudentTask[];
  academicUpdates: AcademicUpdate[];
  adminPin: string;
  config: SheetSyncConfig;
  users: SystemUser[];
}) {
  const batch = writeBatch(db);

  // Seed teachers
  data.teachers.forEach(item => {
    const dRef = doc(db, 'teachers', item.id);
    batch.set(dRef, item);
  });

  // Seed schoolYears
  data.schoolYears.forEach(item => {
    const dRef = doc(db, 'schoolYears', item.id);
    batch.set(dRef, item);
  });

  // Seed classes
  data.classes.forEach(item => {
    const dRef = doc(db, 'classes', item.id);
    batch.set(dRef, item);
  });

  // Seed students
  data.students.forEach(item => {
    const dRef = doc(db, 'students', item.id);
    batch.set(dRef, item);
  });

  // Seed violations
  data.violations.forEach(item => {
    const dRef = doc(db, 'violations', item.id);
    batch.set(dRef, item);
  });

  // Seed violationTypes
  data.violationTypes.forEach(item => {
    const dRef = doc(db, 'violationTypes', item.id);
    batch.set(dRef, item);
  });

  // Seed plans
  data.plans.forEach(item => {
    const dRef = doc(db, 'plans', item.id);
    batch.set(dRef, item);
  });

  // Seed tasks
  data.tasks.forEach(item => {
    const dRef = doc(db, 'tasks', item.id);
    batch.set(dRef, item);
  });

  // Seed academicUpdates
  data.academicUpdates.forEach(item => {
    const dRef = doc(db, 'academicUpdates', item.id);
    batch.set(dRef, item);
  });

  // Seed users
  data.users.forEach(item => {
    const dRef = doc(db, 'users', item.id);
    batch.set(dRef, item);
  });

  // Seed global settings
  const globalRef = doc(db, 'settings', 'global');
  batch.set(globalRef, {
    adminPin: data.adminPin,
    config: data.config
  });

  await batch.commit();
}

// Single item saving helpers
export async function saveTeacher(item: Teacher) {
  await setDoc(doc(db, 'teachers', item.id), item);
}

export async function deleteTeacher(id: string) {
  await deleteDoc(doc(db, 'teachers', id));
}

export async function saveSchoolYear(item: SchoolYear) {
  await setDoc(doc(db, 'schoolYears', item.id), item);
}

export async function deleteSchoolYear(id: string) {
  await deleteDoc(doc(db, 'schoolYears', id));
}

export async function saveClass(item: ClassItem) {
  await setDoc(doc(db, 'classes', item.id), item);
}

export async function deleteClass(id: string) {
  await deleteDoc(doc(db, 'classes', id));
}

export async function saveStudent(item: Student) {
  await setDoc(doc(db, 'students', item.id), item);
}

export async function deleteStudent(id: string) {
  await deleteDoc(doc(db, 'students', id));
}

export async function saveViolation(item: ViolationRecord) {
  await setDoc(doc(db, 'violations', item.id), item);
}

export async function deleteViolation(id: string) {
  await deleteDoc(doc(db, 'violations', id));
}

export async function saveViolationType(item: ViolationType) {
  await setDoc(doc(db, 'violationTypes', item.id), item);
}

export async function deleteViolationType(id: string) {
  await deleteDoc(doc(db, 'violationTypes', id));
}

export async function savePlan(item: WeeklyPlan) {
  await setDoc(doc(db, 'plans', item.id), item);
}

export async function deletePlan(id: string) {
  await deleteDoc(doc(db, 'plans', id));
}

export async function saveTask(item: StudentTask) {
  await setDoc(doc(db, 'tasks', item.id), item);
}

export async function deleteTask(id: string) {
  await deleteDoc(doc(db, 'tasks', id));
}

export async function saveAcademicUpdate(item: AcademicUpdate) {
  await setDoc(doc(db, 'academicUpdates', item.id), item);
}

export async function deleteAcademicUpdate(id: string) {
  await deleteDoc(doc(db, 'academicUpdates', id));
}

export async function saveUser(item: SystemUser) {
  await setDoc(doc(db, 'users', item.id), item);
}

export async function deleteUser(id: string) {
  await deleteDoc(doc(db, 'users', id));
}

export async function saveGlobalSettings(settings: { adminPin: string; config: SheetSyncConfig }) {
  await setDoc(doc(db, 'settings', 'global'), settings);
}

export async function saveAnnouncement(item: Announcement) {
  await setDoc(doc(db, 'announcements', item.id), item);
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, 'announcements', id));
}

export async function saveTimetable(classId: string, cells: any[]) {
  await setDoc(doc(db, 'timetables', classId), { classId, cells });
}

export async function saveReminder(classId: string, date: string, text: string) {
  await setDoc(doc(db, 'reminders', `${classId}_${date}`), { classId, date, text });
}

export async function deleteReminder(classId: string, date: string) {
  await deleteDoc(doc(db, 'reminders', `${classId}_${date}`));
}

export async function saveParticipation(classId: string, date: string, data: Record<string, number>) {
  await setDoc(doc(db, 'participations', `${classId}_${date}`), { classId, date, data });
}

export async function saveDuty(classId: string, weekNumber: number, schedule: any) {
  await setDoc(doc(db, 'duties', `${classId}_week_${weekNumber}`), { classId, weekNumber, schedule });
}
