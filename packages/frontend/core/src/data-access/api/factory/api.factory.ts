import { DIFactory } from "../../../common/utils/dependency-injection/di.factory";
import { IApiFactory } from "./api.factory.types";

export const ApiFactory = DIFactory<IApiFactory>("Api");
