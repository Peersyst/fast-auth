use near_sdk::base64;
use base64::Engine;

pub fn decode_jwt(jwt: String) -> (String, String, String) {
    let mut it = jwt.splitn(3, '.');
    let (header, payload, signature) = match (it.next(), it.next(), it.next()) {
        (Some(h), Some(p), Some(s)) => (h, p, s),
        _ => return ("".to_string(), "".to_string(), "".to_string()),
    };
    // Reject tokens with extra dots
    if signature.contains('.') {
        return ("".to_string(), "".to_string(), "".to_string());
    }

    (header.to_string(), payload.to_string(), signature.to_string())
}

pub fn decode_base64_bytes(base64: String) -> Vec<u8> {
    let bytes = match base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(base64.as_bytes()) {
        Ok(bytes) => bytes,
        Err(_) => return vec![],
    };

    bytes
}
