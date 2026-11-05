import { DIFactory } from "../../../common/utils/dependency-injection/di.factory";
import { IControllerFactory } from "./controller.factory.types";

export const ControllerFactory = DIFactory<IControllerFactory>("Controller");
