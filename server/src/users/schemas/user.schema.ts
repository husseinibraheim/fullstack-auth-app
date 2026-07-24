import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  // Shape every serialized user identically, wherever it exits the app. This
  // is the second line of defence behind `select: false`: even if a caller
  // explicitly re-selects passwordHash (the login path does), it can never
  // reach a JSON response body. Also maps Mongo's `_id` to a clean `id` and
  // drops the internal version key so the API never leaks its storage shape.
  toJSON: {
    virtuals: false,
    versionKey: false,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  },
})
export class User {
  // Stored normalized (see normalize-email.ts). `unique` is an index directive,
  // not a validator — a duplicate insert throws Mongo's E11000 at the driver,
  // which UsersService translates into a 409.
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true, minlength: 3, maxlength: 50 })
  name!: string;

  // Never selected by default. Only findByEmailWithPassword re-adds it.
  @Prop({ required: true, select: false })
  passwordHash!: string;

  // Managed by `timestamps: true`; declared here so they are typed on the document.
  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
