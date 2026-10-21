import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { UserRole } from '../domain/user-role.enum.js';

@Schema({
  collection: 'users',
  timestamps: { createdAt: true, updatedAt: false },
})
export class UserModel {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  username: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, enum: Object.values(UserRole), default: UserRole.USER })
  role: UserRole;

  @Prop({ type: String, required: true, trim: true })
  displayName: string;

  @Prop({ type: String, default: '' })
  bio: string;

  @Prop({ type: Boolean, default: false })
  suspended: boolean;

  createdAt: Date;
}

export type UserDocument = HydratedDocument<UserModel>;
export const UserSchema = SchemaFactory.createForClass(UserModel);
