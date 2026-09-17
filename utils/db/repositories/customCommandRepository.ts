import { eq, like } from 'drizzle-orm';
import { getDb, type AppDb } from '../client';
import { customCommand, type CustomCommand } from '../schema';

type CreateInput = { title: string; command: string; description: string; response: string };
type UpdateInput = { title?: string; description?: string; response?: string; isActive?: boolean };

export class CustomCommandRepository {
  constructor(guildId: string, private readonly db: AppDb = getDb(guildId)) {}
  normalizeCommandName(raw: string): string { return raw.trim().toLowerCase().replace(/\s+/g, '-'); }

  findByCommand(commandName: string): CustomCommand | undefined {
    return this.db.select().from(customCommand).where(eq(customCommand.command, this.normalizeCommandName(commandName))).get();
  }
  list(): CustomCommand[] { return this.db.select().from(customCommand).all(); }
  search(term: string): CustomCommand[] {
    return this.db.select().from(customCommand).where(like(customCommand.command, `%${this.normalizeCommandName(term)}%`)).all();
  }
  create(input: CreateInput): CustomCommand | undefined {
    const command = this.normalizeCommandName(input.command);
    this.db.insert(customCommand).values({ ...input, title: input.title.trim(), description: input.description.trim(), command, isActive: true }).run();
    return this.findByCommand(command);
  }
  update(commandName: string, input: UpdateInput): number {
    return this.db.update(customCommand).set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(customCommand.command, this.normalizeCommandName(commandName))).run().changes;
  }
  delete(commandName: string): number {
    return this.db.delete(customCommand).where(eq(customCommand.command, this.normalizeCommandName(commandName))).run().changes;
  }
}
