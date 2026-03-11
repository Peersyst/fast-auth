"""KMS signing-key rotation Lambda.

Rotates three KMS aliases that form a sliding window:

    previous  ->  current  ->  next

The issuer signs with "current" and still accepts "previous" so tokens
issued just before a rotation remain valid.  "next" is pre-created so the
issuer can warm its cache before the key becomes "current".

Each invocation shifts the window forward by one position, creates a fresh
key in the "next" slot, and retires the old "previous" key.

Crash recovery: alias updates are ordered so that each intermediate state
is distinguishable (prev==curr or curr==next), allowing the next invocation
to detect and resume a partial rotation.
"""

import boto3
import logging
from enum import IntEnum

logger = logging.getLogger()
logger.setLevel(logging.INFO)

kms = boto3.client("kms")

PREVIOUS = "alias/signing-previous"
CURRENT = "alias/signing-current"
NEXT = "alias/signing-next"

KEY_SPEC = "RSA_2048"


class RotationStart(IntEnum):
    """Controls which alias-update steps to execute.

    Numeric ordering enables fall-through: rotate_aliases() uses ``<=``
    so a crash-recovery start value skips the already-completed steps.
    """

    UPDATE_PREVIOUS = 1
    UPDATE_CURRENT = 2
    UPDATE_NEXT = 3


def get_key_id(alias):
    resp = kms.describe_key(KeyId=alias)
    return resp["KeyMetadata"]["KeyId"]


def read_current_state():
    prev_id = get_key_id(PREVIOUS)
    curr_id = get_key_id(CURRENT)
    next_id = get_key_id(NEXT)
    logger.info(f"Current state: prev={prev_id}, curr={curr_id}, next={next_id}")
    return prev_id, curr_id, next_id


def detect_rotation_start(prev_id, curr_id, next_id):
    """Detect if a previous rotation crashed halfway and return where to resume.

    If all three differ, no crash occurred, the full rotation must be run.
    """
    if prev_id == curr_id:
        logger.warning("Detected partial rotation (prev==curr) — resuming from UPDATE_CURRENT")
        return RotationStart.UPDATE_CURRENT
    if curr_id == next_id:
        logger.warning("Detected partial rotation (curr==next) — resuming from UPDATE_NEXT")
        return RotationStart.UPDATE_NEXT
    return RotationStart.UPDATE_PREVIOUS


def rotate_aliases(start, old_current, old_next, new_key_id):
    """Shift the alias window forward, skipping steps already done.

    Order matters: previous -> current -> next.  Each completed step leaves a
    detectable duplicate that detect_rotation_start() can pick up on re-entry.
    """
    try:
        if start <= RotationStart.UPDATE_PREVIOUS:
            kms.update_alias(AliasName=PREVIOUS, TargetKeyId=old_current)
        if start <= RotationStart.UPDATE_CURRENT:
            kms.update_alias(AliasName=CURRENT, TargetKeyId=old_next)
        kms.update_alias(AliasName=NEXT, TargetKeyId=new_key_id)
    except Exception as e:
        logger.error(f"ALIAS ROTATION FAILED — check alias state manually: {e}")
        raise


def retire_key(key_id):
    try:
        kms.disable_key(KeyId=key_id)
        kms.schedule_key_deletion(KeyId=key_id, PendingWindowInDays=7)
        logger.info(f"Retired old key: {key_id}")
        return key_id
    except Exception as e:
        logger.warning(f"Failed to retire old key {key_id}: {e}")
        return None


def lambda_handler(event, context):
    prev_id, curr_id, next_id = read_current_state()
    start = detect_rotation_start(prev_id, curr_id, next_id)

    # Create the new key before touching aliases, if rotation fails we just
    # have an orphaned key (harmless) rather than aliases pointing nowhere.
    new_key_id = kms.create_key(KeySpec=KEY_SPEC, KeyUsage="SIGN_VERIFY")["KeyMetadata"]["KeyId"]
    logger.info(f"Created new key: {new_key_id}")

    rotate_aliases(start, curr_id, next_id, new_key_id)
    logger.info(f"Aliases rotated: prev={curr_id}, curr={next_id}, next={new_key_id}")

    # Only retire the old key on a clean (non-recovery) run, during crash
    # recovery the "previous" key may still be the one clients are using.
    scheduled_for_deletion = retire_key(prev_id) if start == RotationStart.UPDATE_PREVIOUS else None

    return {
        "previous": curr_id,
        "current": next_id,
        "next": new_key_id,
        "scheduled_for_deletion": scheduled_for_deletion,
    }
