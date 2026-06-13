import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  // Strips @Exclude()-decorated fields (e.g. password) from any class-instance responses.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useWebSocketAdapter(new IoAdapter(app));
  // All REST routes live under /api, EXCEPT health — AgentBase Runtime requires
  // a liveness probe at the root path GET /health.
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const config = new DocumentBuilder()
    .setTitle('HR Interview Platform API')
    .setDescription(
      'REST + WebSocket API for the AI-powered HR interview platform: jobs, candidates, ' +
        'question sets, interview orchestration, and AI-generated reports.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
  console.log(`Backend running on http://localhost:${process.env.PORT || 3001}`);
}
bootstrap();
