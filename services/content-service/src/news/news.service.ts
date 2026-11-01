
import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
    News,
    NewsDocument,
} from './schemas/news.schema';

import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
    constructor(
        @InjectModel(News.name)
        private readonly newsModel: Model<NewsDocument>,
    ) { }

    // Kiểm tra ID MongoDB
    private validateObjectId(id: string): void {
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            throw new BadRequestException('News ID không hợp lệ');
        }
    }

    // GET /content/news
    // Lấy danh sách tin tức mới nhất trước
    async findAll() {
        return this.newsModel
            .find()
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean();
    }

    // GET /content/news/:id
    async findOne(id: string) {
        this.validateObjectId(id);

        const news = await this.newsModel.findById(id).lean();

        if (!news) {
            throw new NotFoundException('Tin tức không tồn tại');
        }

        return news;
    }

    // POST /content/news
    async create(dto: CreateNewsDto) {
        const news = new this.newsModel(dto);
        return news.save();
    }

    // PATCH /content/news/:id
    async update(id: string, dto: UpdateNewsDto) {
        this.validateObjectId(id);

        const news = await this.newsModel
            .findByIdAndUpdate(
                id,
                { $set: dto },
                {
                    new: true,
                    runValidators: true,
                },
            )
            .lean();

        if (!news) {
            throw new NotFoundException('Tin tức không tồn tại');
        }

        return news;
    }

    // DELETE /content/news/:id
    async remove(id: string) {
        this.validateObjectId(id);

        const news = await this.newsModel.findByIdAndDelete(id);

        if (!news) {
            throw new NotFoundException('Tin tức không tồn tại');
        }

        return {
            message: 'Xóa tin tức thành công',
            id,
        };
    }
}
