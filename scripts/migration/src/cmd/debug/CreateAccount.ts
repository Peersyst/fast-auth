import { MPCProvider } from "../../provider/MPCProvider";
import { KeyPair } from "near-api-js";

const JWT_TOKEN = "ey...";

(async () => {
    const keyPair = KeyPair.fromString("ed25519:MHz6wrZAegmeCXT6frJCJLYtGy39pz48JFeu2R1zKpeS74PVbaCXnZ1h8cCNzt9yyr2rq9DFswJWx7gWD5gRgFd");
    const mpc = new MPCProvider("http://localhost:3000", keyPair.toString(), 3177899144);
    const claimOidcTokenRes = await mpc.claimOidcToken(JWT_TOKEN);
    for (let i = 0; i < 10; i++) {
        console.log("claimOidcTokenRes", claimOidcTokenRes);
        const userCredentials = await mpc.userCredentials(JWT_TOKEN);
        console.log("userCredentials", userCredentials);
        const createNewAccountResponse = await mpc.createNewAccount(JWT_TOKEN, `localmpctest03${i}.testnet`);
        console.log("createNewAccountResponse", createNewAccountResponse);
    }
})();
