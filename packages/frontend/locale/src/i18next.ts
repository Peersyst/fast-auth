import "i18next";
import { LocaleResource } from "./types";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "translation";
        resources: LocaleResource;
        returnNull: false;
    }
}
