import { createTestingModuleWithConfig, MANAGEMENT_AUTH0, TEST_CONFIG } from "../../utils/test-config";
import { Auth0ProvisionerName } from "../../../src/config/console-config";
import type { ConsoleConfig } from "../../../src/config/console-config";
import { Auth0ManagementProvisioner } from "../../../src/modules/provisioning/auth0-management.provisioner";
import { AUTH0_PROVISIONER } from "../../../src/modules/provisioning/auth0-provisioner";
import { FakeProvisioner } from "../../../src/modules/provisioning/fake.provisioner";
import { ProvisioningModule } from "../../../src/modules/provisioning/provisioning.module";

/**
 * Builds the test config for a provisioner.
 * @param provisioner The provisioner to select.
 * @returns The config.
 */
const makeConfig = (provisioner: Auth0ProvisionerName): ConsoleConfig => ({
    ...TEST_CONFIG,
    auth0: provisioner === Auth0ProvisionerName.MANAGEMENT ? MANAGEMENT_AUTH0 : TEST_CONFIG.auth0,
});

describe("ProvisioningModule", () => {
    it.each([
        [Auth0ProvisionerName.FAKE, FakeProvisioner],
        [Auth0ProvisionerName.MANAGEMENT, Auth0ManagementProvisioner],
    ] as const)("should provide the %s provisioner", async (provisioner, expected) => {
        const moduleRef = await createTestingModuleWithConfig(makeConfig(provisioner), ProvisioningModule).compile();
        await moduleRef.init();
        expect(moduleRef.get(AUTH0_PROVISIONER)).toBeInstanceOf(expected);
        await moduleRef.close();
    });
});
