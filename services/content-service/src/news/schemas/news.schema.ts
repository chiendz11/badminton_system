
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsDocument = HydratedDocument<News>;

@Schema({ timestamps: true, collection: 'news' })
export class News {
    @Prop({ required: true, trim: true })
    title!: string;

    @Prop({ required: true, trim: true })
    summary!: string;

    @Prop({ default: '' })
    image!: string;

    @Prop({ required: true })
    url!: string;

    @Prop({ default: 'general' })
    category!: string;

    @Prop({ default: 'Unknown' })
    source!: string;

    // Giữ định dạng ngày của hệ thống cũ
    @Prop({ default: '' })
    date!: string;

    // Trường mới để sắp xếp thời gian chính xác
    @Prop({ type: Date })
    publishedAt?: Date;
}

export const NewsSchema = SchemaFactory.createForClass(News);

NewsSchema.index({ publishedAt: -1, createdAt: -1 });
