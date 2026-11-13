import { DIFactory } from "../../../common/utils/dependency-injection/di.factory";
import { IRepositoryFactory } from "./repository.factory.types";

export const RepositoryFactory = DIFactory<IRepositoryFactory>("Repository");
