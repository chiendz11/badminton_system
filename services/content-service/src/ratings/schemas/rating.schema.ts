
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RatingDocument = HydratedDocument<Rating>;

@Schema({ timestamps: true })
export class Rating {
    @Prop({ type: String, required: true })
    centerId!: string;

    @Prop({ type: String, required: true })
    userId!: string;

    @Prop({ type: Number, required: true, min: 1, max: 5 })
    score!: number;

    @Prop({ type: String, default: '' })
    comment!: string;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ centerId: 1, createdAt: -1 });
