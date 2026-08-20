import { relations } from "drizzle-orm/relations";
import { users } from "./schema.js";

export const usersRelations = relations(users, ({ one, many }) => ({
  milkman: one(users, {
    fields: [users.milkmanId],
    references: [users.id],
    relationName: "usersToMilkman",
  }),
  clients: many(users, { relationName: "usersToMilkman" }),
}));
