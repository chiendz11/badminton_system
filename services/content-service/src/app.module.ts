
import {
    Module,
    Controller,
    Get,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RatingsModule } from './ratings/ratings.module';
import { NewsModule } from './news/news.module';

@Controller('health')
class HealthController {
    @Get()
    getHealth() {
        return {
            status: 'ok',
            service: 'content-service',
        };
    }
}

@Module({
    imports: [
        MongooseModule.forRoot(
            process.env.MONGODB_URI ??
            'mongodb://127.0.0.1:27017/badminton_content',
            {
                serverSelectionTimeoutMS: 5000,
            },
        ),
        RatingsModule,
        NewsModule,
    ],
    controllers: [HealthController],
})
export class AppModule { }
