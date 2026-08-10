import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ActivityEventsController } from './activity-events.controller';
import { ActivityEventsService } from './activity-events.service';
import { ActivityEvent } from './entities/activity-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityEvent]), AuthModule],
  controllers: [ActivityEventsController],
  providers: [ActivityEventsService],
})
export class ActivityEventsModule {}
