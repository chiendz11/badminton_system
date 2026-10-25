import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  // Tạo Microservice kết nối RabbitMQ
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'notification_queue',
      noAck: false, // Bắt buộc để bật chế độ kiểm soát ack/nack thủ công cho DLQ
    },
  });

  await app.listen();
  console.log('Notification Microservice is listening to RabbitMQ...');
}
bootstrap();