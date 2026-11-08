
import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    const port = Number(process.env.CONTENT_PORT ?? 3001);

    await app.listen(port, '0.0.0.0');
    console.log(`Content Service running on port ${port}`);
}

bootstrap().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
