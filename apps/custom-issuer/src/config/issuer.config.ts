export type IssuerConfig = {
  keyPath: string;
  validationPublicKeyPath: string;
  issuerUrl: string;
};

export default (): IssuerConfig => {
  const keyPath = process.env.KEY_PATH;
  const validationPublicKeyPath = process.env.VALIDATION_PUBLIC_KEY_PATH;
  const issuerUrl = process.env.ISSUER_URL;

  if (!keyPath || keyPath.trim() === '') {
    throw new Error(
      'Missing required environment variable: KEY_PATH. Please set KEY_PATH to the path of the signing private key.',
    );
  }

  if (!validationPublicKeyPath || validationPublicKeyPath.trim() === '') {
    throw new Error(
      'Missing required environment variable: VALIDATION_PUBLIC_KEY_PATH. Please set VALIDATION_PUBLIC_KEY_PATH to the path of the validation public key.',
    );
  }

  if (!issuerUrl || issuerUrl.trim() === '') {
    throw new Error(
      'Missing required environment variable: ISSUER_URL. Please set ISSUER_URL to the URL of the issuer service.',
    );
  }

  return {
    keyPath: keyPath.trim(),
    validationPublicKeyPath: validationPublicKeyPath.trim(),
    issuerUrl: issuerUrl.trim(),
  };
};
