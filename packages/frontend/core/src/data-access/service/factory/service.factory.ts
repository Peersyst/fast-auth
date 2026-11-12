import { DIFactory } from "../../../common/utils/dependency-injection/di.factory";
import { IServiceFactory } from "./service.factory.types";

export const ServiceFactory = DIFactory<IServiceFactory>("Service");
