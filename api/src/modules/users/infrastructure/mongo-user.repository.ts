import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { UserConflictError } from '../domain/user-conflict.error.js';
import type { NewUser, ProfileChanges, User } from '../domain/user.entity.js';
import { UserRepository } from '../domain/user.repository.js';
import { UserDocument, UserModel } from './user.schema.js';

@Injectable()
export class MongoUserRepository extends UserRepository {
  constructor(
    @InjectModel(UserModel.name) private readonly userModel: Model<UserModel>,
  ) {
    super();
  }

  async create(data: NewUser): Promise<User> {
    try {
      const doc = await this.userModel.create(data);
      return this.toDomain(doc);
    } catch (error) {
      throw this.translateDuplicateKey(error) ?? error;
    }
  }

  async findById(id: string): Promise<User | null> {
    // Um id mal formado não é erro do sistema: simplesmente não existe.
    if (!isValidObjectId(id)) return null;
    const doc = await this.userModel.findById(id);
    return doc && this.toDomain(doc);
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ email: email.toLowerCase() });
    return doc && this.toDomain(doc);
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await this.userModel.findOne({
      username: username.toLowerCase(),
    });
    return doc && this.toDomain(doc);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    const docs = await this.userModel.find({
      _id: { $in: ids.filter((id) => isValidObjectId(id)) },
    });
    return docs.map((doc) => this.toDomain(doc));
  }

  async updateProfile(
    id: string,
    changes: ProfileChanges,
  ): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    // Só os campos do perfil entram no $set: nada além disso é editável por aqui.
    const doc = await this.userModel.findByIdAndUpdate(
      id,
      { displayName: changes.displayName, bio: changes.bio },
      { new: true },
    );
    return doc && this.toDomain(doc);
  }

  async setSuspended(id: string, suspended: boolean): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.userModel.findByIdAndUpdate(
      id,
      { suspended },
      { new: true },
    );
    return doc && this.toDomain(doc);
  }

  // E11000 = violação de índice único (username ou email).
  private translateDuplicateKey(error: unknown): UserConflictError | null {
    if (typeof error !== 'object' || error === null) return null;
    const { code, keyPattern } = error as {
      code?: number;
      keyPattern?: Record<string, number>;
    };
    if (code !== 11000 || !keyPattern) return null;
    return new UserConflictError('email' in keyPattern ? 'email' : 'username');
  }

  private toDomain(doc: UserDocument): User {
    return {
      id: doc._id.toString(),
      username: doc.username,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role,
      displayName: doc.displayName,
      bio: doc.bio,
      suspended: doc.suspended,
      createdAt: doc.createdAt,
    };
  }
}
