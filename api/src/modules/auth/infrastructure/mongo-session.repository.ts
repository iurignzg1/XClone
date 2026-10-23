import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NewSession, Session } from '../domain/session.entity.js';
import { SessionRepository } from '../domain/session.repository.js';
import { SessionDocument, SessionModel } from './session.schema.js';

@Injectable()
export class MongoSessionRepository extends SessionRepository {
  constructor(
    @InjectModel(SessionModel.name)
    private readonly sessionModel: Model<SessionModel>,
  ) {
    super();
  }

  async create(data: NewSession): Promise<Session> {
    const doc = await this.sessionModel.create(data);
    return this.toDomain(doc);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const doc = await this.sessionModel.findOne({ tokenHash });
    return doc && this.toDomain(doc);
  }

  async revoke(id: string): Promise<boolean> {
    const doc = await this.sessionModel.findOneAndUpdate(
      { _id: id, revokedAt: null },
      { revokedAt: new Date() },
    );
    return doc !== null;
  }

  async revokeAllByUser(userId: string): Promise<void> {
    await this.sessionModel.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  private toDomain(doc: SessionDocument): Session {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt,
      userAgent: doc.userAgent,
      loginAt: doc.loginAt,
    };
  }
}
