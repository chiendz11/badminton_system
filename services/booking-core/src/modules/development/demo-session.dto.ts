import { IsIn } from "class-validator";
export class DemoDto {
  @IsIn(["customer", "customer2", "manager", "admin"]) profile!:
    "customer" | "customer2" | "manager" | "admin";
}
