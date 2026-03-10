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

    # If a previous rotation crashed halfway through, the aliases will be in a
    # wrong state. We can tell exactly where it stopped because each update_alias
    # call is atomic.
    if old_previous == old_current:
        # Previous already got updated but current still holds the old value
        skip_steps = {1}
        logger.warning("Detected partial rotation (prev==curr) — resuming from step 2")
    elif old_current == old_next:
        # Previous and current were updated, only the next alias swap is missing
        skip_steps = {1, 2}
        logger.warning("Detected partial rotation (curr==next) — resuming from step 3")
    else:
        skip_steps = set()

    new_key = kms.create_key(KeySpec=KEY_SPEC, KeyUsage="SIGN_VERIFY")
    new_key_id = new_key["KeyMetadata"]["KeyId"]

    logger.info(f"Created new key: {new_key_id}")

    try:
        if 1 not in skip_steps:
            kms.update_alias(AliasName=PREVIOUS, TargetKeyId=old_current)
        if 2 not in skip_steps:
            kms.update_alias(AliasName=CURRENT, TargetKeyId=old_next)
        kms.update_alias(AliasName=NEXT, TargetKeyId=new_key_id)
    except Exception as e:
        logger.error(f"ALIAS ROTATION FAILED — check alias state manually: {e}")
        raise

    logger.info(f"Aliases rotated: prev={old_current}, curr={old_next}, next={new_key_id}")

    # Delete only the old key when the rotation was clean. If we're recovering
    # from a partial failure we can't be sure which key is safe to remove.
    retired = None
    if not skip_steps:
        try:
            kms.disable_key(KeyId=old_previous)
            kms.schedule_key_deletion(KeyId=old_previous, PendingWindowInDays=7)
            retired = old_previous
            logger.info(f"Retired old key: {old_previous}")
        except Exception as e:
            logger.warning(f"Failed to retire old key {old_previous}: {e}")

    return {
        "previous": old_current,
        "current": old_next,
        "next": new_key_id,
        "retired": retired,
    }
