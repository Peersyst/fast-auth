import { PartialType } from "@nestjs/swagger";
import { CreateDappRequest } from "./create-dapp.request";

/** A missing field is left as it is. A null one is refused like any other invalid value. */
export class UpdateDappRequest extends PartialType(CreateDappRequest, { skipNullProperties: false }) {}
