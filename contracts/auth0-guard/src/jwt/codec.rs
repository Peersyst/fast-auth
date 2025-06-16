use near_sdk::base64;
use base64::Engine;

pub fn decode_jwt(jwt: String) -> (String, String, String) {
    // Split the JWT token into its parts
    let parts: Vec<&str> = jwt.split('.').collect();
    if parts.len() != 3 {
        return ("".to_string(), "".to_string(), "".to_string());
    }

    // Get the header and payload
    let header = parts[0];
    let payload = parts[1];
    let signature = parts[2];

    (header.to_string(), payload.to_string(), signature.to_string())
}

pub fn decode_base64_bytes(base64: String) -> Vec<u8> {
    let bytes = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(base64.as_bytes()) {
        Ok(bytes) => bytes,
        Err(_) => return vec![],
    };

    bytes
}
