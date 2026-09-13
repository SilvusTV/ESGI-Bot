import { and, asc, eq, gt, lte } from 'drizzle-orm';
import { getDb, type AppDb } from '../client';
import { homework, subject, teacher, type Homework, type Subject, type Teacher } from '../schema';

export type SubjectWithTeacher = Subject & { teacherFirstName: string | null; teacherLastName: string | null; teacherEmail: string | null };
export type HomeworkWithSubject = Homework & { subjectName: string; teacherFirstName: string | null; teacherLastName: string | null };

export class AcademicRepository {
  constructor(private readonly db: AppDb = getDb()) {}
  listTeachers(): Teacher[] { return this.db.select().from(teacher).orderBy(asc(teacher.lastName)).all(); }
  getTeacher(id: number): Teacher | undefined { return this.db.select().from(teacher).where(eq(teacher.id, id)).get(); }
  addTeacher(firstName: string, lastName: string, email: string): Teacher {
    const result = this.db.insert(teacher).values({ firstName, lastName, email }).run();
    return this.getTeacher(Number(result.lastInsertRowid))!;
  }
  updateTeacher(id: number, values: Partial<Pick<Teacher, 'firstName' | 'lastName' | 'email'>>): number {
    return this.db.update(teacher).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(teacher.id, id)).run().changes;
  }
  deleteTeacher(id: number): number { return this.db.delete(teacher).where(eq(teacher.id, id)).run().changes; }

  listSubjects(): SubjectWithTeacher[] {
    return this.db.select({ id: subject.id, name: subject.name, teacherId: subject.teacherId, createdAt: subject.createdAt, updatedAt: subject.updatedAt,
      teacherFirstName: teacher.firstName, teacherLastName: teacher.lastName, teacherEmail: teacher.email })
      .from(subject).leftJoin(teacher, eq(subject.teacherId, teacher.id)).orderBy(asc(subject.name)).all();
  }
  getSubject(id: number): Subject | undefined { return this.db.select().from(subject).where(eq(subject.id, id)).get(); }
  addSubject(name: string, teacherId: number | null): Subject {
    const result = this.db.insert(subject).values({ name, teacherId }).run();
    return this.getSubject(Number(result.lastInsertRowid))!;
  }
  updateSubject(id: number, values: Partial<Pick<Subject, 'name' | 'teacherId'>>): number {
    return this.db.update(subject).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(subject.id, id)).run().changes;
  }
  deleteSubject(id: number): number { return this.db.delete(subject).where(eq(subject.id, id)).run().changes; }

  listUpcomingHomework(until?: number): HomeworkWithSubject[] {
    const conditions = [gt(homework.dueAt, Math.floor(Date.now() / 1000))];
    if (until) conditions.push(lte(homework.dueAt, until));
    return this.db.select({ id: homework.id, subjectId: homework.subjectId, type: homework.type, description: homework.description,
      resourceUrl: homework.resourceUrl, dueAt: homework.dueAt, createdBy: homework.createdBy, createdAt: homework.createdAt,
      updatedAt: homework.updatedAt, subjectName: subject.name, teacherFirstName: teacher.firstName, teacherLastName: teacher.lastName })
      .from(homework).innerJoin(subject, eq(homework.subjectId, subject.id)).leftJoin(teacher, eq(subject.teacherId, teacher.id))
      .where(and(...conditions)).orderBy(asc(homework.dueAt)).all();
  }
  addHomework(values: { subjectId: number; type: string; description?: string; resourceUrl?: string; dueAt: number; createdBy: string }): Homework {
    const result = this.db.insert(homework).values({ ...values, description: values.description || null, resourceUrl: values.resourceUrl || null }).run();
    return this.db.select().from(homework).where(eq(homework.id, Number(result.lastInsertRowid))).get()!;
  }
  deleteHomework(id: number): number { return this.db.delete(homework).where(eq(homework.id, id)).run().changes; }
}
