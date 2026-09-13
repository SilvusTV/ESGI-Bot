import { and, eq, like } from 'drizzle-orm';
import { getDb, type AppDb } from '../client';
import { customCommand, type CustomCommand } from '../schema';

type CreateCustomCommandInput = {
  guildId: string;
  title: string;
  command: string;
  description: string;
  response: string;
};

type UpdateCustomCommandInput = {
  title?: string;
  description?: string;
  response?: string;
  isActive?: boolean;
};

export class CustomCommandRepository {
  constructor(private readonly db: AppDb = getDb()) {}

  normalizeCommandName(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '-');
  }

  findByCommand(guildId: string, commandName: string): CustomCommand | undefined {
    const normalized = this.normalizeCommandName(commandName);
    return this.db
      .select()
      .from(customCommand)
      .where(and(eq(customCommand.guildId, guildId), eq(customCommand.command, normalized)))
      .get();
  }

  listByGuild(guildId: string): CustomCommand[] {
    return this.db.select().from(customCommand).where(eq(customCommand.guildId, guildId)).all();
  }

  listByGuildAndCommandLike(guildId: string, term: string): CustomCommand[] {
    const normalized = this.normalizeCommandName(term);
    return this.db
      .select()
      .from(customCommand)
      .where(and(eq(customCommand.guildId, guildId), like(customCommand.command, `%${normalized}%`)))
      .all();
  }

  create(input: CreateCustomCommandInput): CustomCommand | undefined {
    const normalized = this.normalizeCommandName(input.command);
    this.db
      .insert(customCommand)
      .values({
        guildId: input.guildId,
        title: input.title.trim(),
        command: normalized,
        description: input.description.trim(),
        response: input.response,
        isActive: true,
      })
      .run();

    return this.findByCommand(input.guildId, normalized);
  }

  update(guildId: string, commandName: string, input: UpdateCustomCommandInput): number {
    const normalized = this.normalizeCommandName(commandName);
    const result = this.db
      .update(customCommand)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(customCommand.guildId, guildId), eq(customCommand.command, normalized)))
      .run();

    return result.changes;
  }

  delete(guildId: string, commandName: string): number {
    const normalized = this.normalizeCommandName(commandName);
    const result = this.db
      .delete(customCommand)
      .where(and(eq(customCommand.guildId, guildId), eq(customCommand.command, normalized)))
      .run();

    return result.changes;
  }
}

