import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

kms = boto3.client("kms")

PREVIOUS = "alias/signing-previous"
CURRENT = "alias/signing-current"
NEXT = "alias/signing-next"

KEY_SPEC = "RSA_2048"


def get_key_id(alias):
    resp = kms.describe_key(KeyId=alias)
    return resp["KeyMetadata"]["KeyId"]


def lambda_handler(event, context):
    old_previous = get_key_id(PREVIOUS)
    old_current = get_key_id(CURRENT)
    old_next = get_key_id(NEXT)

    logger.info(f"Current state: prev={old_previous}, curr={old_current}, next={old_next}")

    new_key = kms.create_key(KeySpec=KEY_SPEC, KeyUsage="SIGN_VERIFY")
    new_key_id = new_key["KeyMetadata"]["KeyId"]

    logger.info(f"Created new key: {new_key_id}")

    try:
        kms.update_alias(AliasName=PREVIOUS, TargetKeyId=old_current)
        kms.update_alias(AliasName=CURRENT, TargetKeyId=old_next)
        kms.update_alias(AliasName=NEXT, TargetKeyId=new_key_id)
    except Exception as e:
        logger.error(f"ALIAS ROTATION FAILED — check alias state manually: {e}")
        raise

    logger.info(f"Aliases rotated: prev={old_current}, curr={old_next}, next={new_key_id}")

    try:
        kms.disable_key(KeyId=old_previous)
        kms.schedule_key_deletion(KeyId=old_previous, PendingWindowInDays=7)
        logger.info(f"Retired old key: {old_previous}")
    except Exception as e:
        logger.warning(f"Failed to retire old key {old_previous}: {e}")

    return {
        "previous": old_current,
        "current": old_next,
        "next": new_key_id,
        "retired": old_previous,
    }

