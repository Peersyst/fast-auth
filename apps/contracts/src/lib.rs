pub mod jsonwebtoken;
// Find all our documentation at https://docs.near.org
use near_sdk::{log, near};
use serde::{Deserialize, Serialize};
use crate::jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use crate::jsonwebtoken::errors::ErrorKind;


#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    aud: Vec<String>,
    sub: String,
    pepe: String,
    exp: u64,
}

// Define the contract structure
#[near(contract_state)]
pub struct Contract{
    public_key: String,
    result: String,
}

// Define the default, which automatically initializes the contract
impl Default for Contract {
    fn default() -> Self {
        Self {
            public_key: String::from("-----BEGIN PUBLIC KEY-----\nMIIDHTCCAgWgAwIBAgIJEvM+trkDFLINMA0GCSqGSIb3DQEBCwUAMCwxKjAoBgNVBAMTIWRldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbTAeFw0yNTAzMjYwOTAzMDJaFw0zODEyMDMwOTAzMDJaMCwxKjAoBgNVBAMTIWRldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALdETU6vGfwQ2HzdUHjERzzZqH/TwY/U3Tk94DGSTSlTSrn+ZHiKJavWgI9r8nsbC7qh5yTv5hIX9P//QfIo+mfrizVjT53awvOwCyx+eiTH4gWmrfuhZJQT6WFzzpF6gAv2PiyDDLZGIXoQYHb4o7nM9mxg1uMZ2y5CD4RtiriHaKDtbnxPwWbKTFqqk4i4TFSZw1C6U+GdVziWPTBySffZse35ec06zU7DBJ8ySuDu4ImXCPguULkJMqLAw1RhHUBvNuTbQRVommlUd5Rc++HJJCTfnQmyXetAyZA4DN497GR2MzOB59wQbbQ5wFZbfqL7zCNPIgB/ho7AUt5fotcCAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUrLwHrYIEikv7LKNoKyO1mzumCaswDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQAl23uuwnbD/G856V0km5jiBFB8H4F9cmPWFhNxoEyW5JUpvmsmoJoqmdo+E+OZVfCu4+MjS+R5QByuPnL9OUY2Y3H4Q724nxEMePFykhQRIGWeTG19/lYZYubIXoKwAteUiz0q8yVtTpawvIpL6ChPCtNbhGd7Qr6KuvHdBQXhSdQRfpXWx4EQ3h4NaXI/+t409acWoO/6Jc8u5vO6IqXbaKsp4zEIbmJGHPusthKNKn2JtrcjDW3eD5fdPUV2/OAwpXiqPU6poWZ8P7yettVMXgkl9ENWejAiryVSrHcxoqPwQsRssqaqXSdqEAwCPImhvsHsob2GN0Ers/EdAva/\n-----END PUBLIC KEY-----\n"),
            result: String::new(),
        }
    }
}

// Implement the contract structure
#[near]
impl Contract {
    pub fn verify_jwt(&self, token: String, expected_sub: String, expected_aud: Vec<String>) -> bool {
        let mut validation = Validation::new(Algorithm::RS256);
        validation.sub = Some(expected_sub);
        validation.set_audience(&expected_aud);
        validation.set_required_spec_claims(&["pepe", "exp", "sub", "aud"]);
        let token_data = match decode::<Claims>(&token, &DecodingKey::from_rsa_pem(self.public_key.as_bytes()).unwrap(), &validation) {
            Ok(c) => c,
            Err(err) => match err.kind() {
                ErrorKind::InvalidToken => panic!("Token is invalid"), // Example on how to handle a specific error
                ErrorKind::InvalidIssuer => panic!("Issuer is invalid"), // Example on how to handle a specific error
                ErrorKind::InvalidKeyFormat => panic!("Key format is invalid"), // Example on how to handle a specific error
                ErrorKind::InvalidRsaKey(key) => panic!("Key is invalid: {key}"), // Example on how to handle a specific error
                ErrorKind::ExpiredSignature => panic!("Token has expired"),
                ErrorKind::InvalidAudience => panic!("Audience is invalid"),
                ErrorKind::InvalidSubject => panic!("Subject is invalid"),
                ErrorKind::InvalidSignature => panic!("Signature is invalid"),
                ErrorKind::MissingRequiredClaim(claim) => panic!("Missing required claim: {claim}"),
                ErrorKind::InvalidAlgorithm => panic!("Algorithm is invalid"),
                ErrorKind::Base64(e) => panic!("Base64 error: {e}"),
                ErrorKind::Json(e) => panic!("JSON error: {e}"),
                ErrorKind::Utf8(e) => panic!("UTF-8 error: {e}"),
                ErrorKind::Crypto(e) => panic!("Crypto error: {e}"),
                _ => panic!("Some other errors"),
            },
        };
        log!("Token data: {:?}", token_data);
        true
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;


    #[test]
    fn verify_jwt() {
        let mut contract = Contract::default();
        // let pk = String::from("-----BEGIN PUBLIC KEY-----\nMIIDHTCCAgWgAwIBAgIJEvM+trkDFLINMA0GCSqGSIb3DQEBCwUAMCwxKjAoBgNVBAMTIWRldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbTAeFw0yNTAzMjYwOTAzMDJaFw0zODEyMDMwOTAzMDJaMCwxKjAoBgNVBAMTIWRldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALdETU6vGfwQ2HzdUHjERzzZqH/TwY/U3Tk94DGSTSlTSrn+ZHiKJavWgI9r8nsbC7qh5yTv5hIX9P//QfIo+mfrizVjT53awvOwCyx+eiTH4gWmrfuhZJQT6WFzzpF6gAv2PiyDDLZGIXoQYHb4o7nM9mxg1uMZ2y5CD4RtiriHaKDtbnxPwWbKTFqqk4i4TFSZw1C6U+GdVziWPTBySffZse35ec06zU7DBJ8ySuDu4ImXCPguULkJMqLAw1RhHUBvNuTbQRVommlUd5Rc++HJJCTfnQmyXetAyZA4DN497GR2MzOB59wQbbQ5wFZbfqL7zCNPIgB/ho7AUt5fotcCAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUrLwHrYIEikv7LKNoKyO1mzumCaswDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQAl23uuwnbD/G856V0km5jiBFB8H4F9cmPWFhNxoEyW5JUpvmsmoJoqmdo+E+OZVfCu4+MjS+R5QByuPnL9OUY2Y3H4Q724nxEMePFykhQRIGWeTG19/lYZYubIXoKwAteUiz0q8yVtTpawvIpL6ChPCtNbhGd7Qr6KuvHdBQXhSdQRfpXWx4EQ3h4NaXI/+t409acWoO/6Jc8u5vO6IqXbaKsp4zEIbmJGHPusthKNKn2JtrcjDW3eD5fdPUV2/OAwpXiqPU6poWZ8P7yettVMXgkl9ENWejAiryVSrHcxoqPwQsRssqaqXSdqEAwCPImhvsHsob2GN0Ers/EdAva/\n-----END PUBLIC KEY-----\n");

        // contract.set_public_key(pk);

        let token = String::from("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imd2bXRWLXVzMk83N21tam5NR3FCMCJ9.eyJwZXBlIjoicGVybWlzc2lvbnMiLCJpc3MiOiJodHRwczovL2Rldi1nYjFoNXlyZXBiODVqc3R6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNTIzMTAwMjcxNDA2Nzg0NzAyNyIsImF1ZCI6WyJodHRwczovL2Zhc3QtYXV0aC1wb2MuY29tIiwiaHR0cHM6Ly9kZXYtZ2IxaDV5cmVwYjg1anN0ei51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzQzMDc2ODgzLCJleHAiOjE3NDMxNjMyODMsInNjb3BlIjoib3BlbmlkIHRyYW5zYWN0aW9uOnNlbmQtdHJhbnNhY3Rpb24iLCJhenAiOiI3RG1oV3V1Z1VWSkROU0o0ZWROT1RGbTBjOTh4czlocCJ9.Te6oeqYMim8OuKiO55qH26dUPaZXKg4OgQAJlxnw57lXj7drT9vct5tLQzzl6SV2v-Asb9n9XJGxnnLX21X8m2yBXJk_6PPGzE5kpmOw7DQ9nUckHN1itS4UHCZWh7LY0D2Ck0cdi1Vzb8UnnictzTUCQ20Geb07FtRkTq6HEtGd1YkfdJyYGXalWdJOjTxb70E-pnzbFyLuM7RZ9Y3WEwpQWEbAQ0J2cm0CrG_iQHlMNJmrL-mGvQCTvPykvgF33KafpVglhAB7WiqIVt477-VjusCdSsxlsXJYlAip0n0dyhlov-YGflLQ_dFJ9kg5V1bHU0mVaAoewyRF9F3MNA");
        let expected_sub = String::from("google-oauth2|115231002714067847027");
        let expected_aud = vec!["https://fast-auth-poc.com".to_string(), "https://dev-gb1h5yrepb85jstz.us.auth0.com/userinfo".to_string()];
        assert_eq!(contract.verify_jwt(token.to_string(), expected_sub.to_string(), expected_aud), true);
    }

   
}
