
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

import { AuthGuard } from '../common/auth/auth.guard';
import {
    Roles,
    RolesGuard,
} from '../common/guards/roles.guard';

import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Controller('content/news')
export class NewsController {
    constructor(
        private readonly newsService: NewsService,
    ) { }

    // GET công khai
    @Get()
    findAll() {
        return this.newsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.newsService.findOne(id);
    }

    // Chỉ Super Admin được tạo
    @Post()
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('super_admin')
    create(@Body() dto: CreateNewsDto) {
        return this.newsService.create(dto);
    }

    // Chỉ Super Admin được sửa
    @Patch(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('super_admin')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateNewsDto,
    ) {
        return this.newsService.update(id, dto);
    }

    // Chỉ Super Admin được xóa
    @Delete(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles('super_admin')
    remove(@Param('id') id: string) {
        return this.newsService.remove(id);
    }
}
