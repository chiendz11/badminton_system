
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import type { Actor } from '@badminton/auth-contracts';

import { AuthGuard } from '../common/auth/auth.guard';
import { CurrentActor } from '../common/auth/current-actor.decorator';

import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Controller('content/ratings')
export class RatingsController {
  constructor(
    private readonly ratingsService: RatingsService,
  ) { }

  // GET /content/ratings
  @Get()
  findAll() {
    return this.ratingsService.findAll();
  }

  // GET /content/ratings/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ratingsService.findOne(id);
  }

  // POST /content/ratings
  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() dto: CreateRatingDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.ratingsService.create(dto, actor);
  }

  // PATCH /content/ratings/:id
  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRatingDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.ratingsService.update(id, dto, actor);
  }

  // DELETE /content/ratings/:id
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
  ) {
    return this.ratingsService.remove(id, actor);
  }
}
