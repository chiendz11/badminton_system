
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Actor } from '@badminton/auth-contracts';

import {
  Rating,
  RatingDocument,
} from './schemas/rating.schema';

import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(Rating.name)
    private readonly ratingModel: Model<RatingDocument>,
  ) { }

  private validateObjectId(id: string): void {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      throw new BadRequestException(
        'Rating ID không hợp lệ',
      );
    }
  }

  async findAll() {
    return this.ratingModel
      .find()
      .sort({ createdAt: -1 })
      .lean();
  }

  async findOne(id: string) {
    this.validateObjectId(id);

    const rating = await this.ratingModel
      .findById(id)
      .lean();

    if (!rating) {
      throw new NotFoundException(
        'Rating không tồn tại',
      );
    }

    return rating;
  }

  async create(dto: CreateRatingDto, actor: Actor) {
    const rating = new this.ratingModel({
      ...dto,
      userId: actor.userId,
    });

    return rating.save();
  }

  async update(
    id: string,
    dto: UpdateRatingDto,
    actor: Actor,
  ) {
    this.validateObjectId(id);

    const existing = await this.ratingModel.findById(id);

    if (!existing) {
      throw new NotFoundException(
        'Rating không tồn tại',
      );
    }

    if (
      existing.userId !== actor.userId &&
      actor.role !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Bạn không thể sửa đánh giá của người khác',
      );
    }

    // Điều kiện userId bảo vệ thao tác ghi
    // nếu quyền sở hữu thay đổi giữa hai truy vấn.
    const filter =
      actor.role === 'super_admin'
        ? { _id: id }
        : { _id: id, userId: actor.userId };

    const updated = await this.ratingModel
      .findOneAndUpdate(
        filter,
        { $set: dto },
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();

    if (!updated) {
      throw new ForbiddenException(
        'Không còn quyền cập nhật đánh giá này',
      );
    }

    return updated;
  }

  async remove(id: string, actor: Actor) {
    this.validateObjectId(id);

    const existing = await this.ratingModel.findById(id);

    if (!existing) {
      throw new NotFoundException(
        'Rating không tồn tại',
      );
    }

    if (
      existing.userId !== actor.userId &&
      actor.role !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Bạn không thể xóa đánh giá của người khác',
      );
    }

    const filter =
      actor.role === 'super_admin'
        ? { _id: id }
        : { _id: id, userId: actor.userId };

    const deleted =
      await this.ratingModel.findOneAndDelete(filter);

    if (!deleted) {
      throw new ForbiddenException(
        'Không còn quyền xóa đánh giá này',
      );
    }

    return {
      message: 'Xóa Rating thành công',
      id,
    };
  }
}
