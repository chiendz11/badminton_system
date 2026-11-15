import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const newProduct = new this.productModel(createProductDto);
    return newProduct.save();
  }

  async findAll(category?: string, search?: string): Promise<Product[]> {
    const filter: any = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    return this.productModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${id}`);
    }
    return product;
  }

  async decrementStock(id: string, quantity: number): Promise<void> {
    const updated = await this.productModel.findOneAndUpdate(
      { _id: id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
    );
    if (!updated) {
      throw new BadRequestException(`Sản phẩm ${id} không đủ số lượng tồn kho`);
    }
  }
}