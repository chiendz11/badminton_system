
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RatingDocument = HydratedDocument<Rating>;

@Schema({ timestamps: true })
export class Rating {
    @Prop({ required: true })
    centerId!: string;

    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true, min: 1, max: 5 })
    score!: number;

    @Prop({ default: '' })
    comment!: string;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ centerId: 1, createdAt: -1 });
